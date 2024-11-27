import _ from 'lodash'

function formatTask(task, projectId) {
    return `*[${task.name}](https://app.asana.com/0/${projectId}/${task.gid})* Due: ${
        task.due_on || '**No Due Date**'
    }${task.alertString}${task.placeholder}`.trim()
}

// returns a lodash template string for the standup
function standupTemplate() {
    return `
If the output of this script doesn't look right make any updates needed in Asana and run again.
    - Move tasks to the next workflow stage or blocked, as needed
    - Move tasks back to "To Do" if you are no longer working on them due to a change in priority. Note these in the "Deprioritised" section below with the reason for dropping the task for now.
    - Review and act on, rewrite or delete anything between <ANGLE BRACKETS> as needed. All <ANGLE BRACKETS> placeholders should be removed from your posted notes
Here are your generated notes:
"""
*In Progress:*
    <% _.forEach(data.tasks['In Progress'], function(task, index) { %><%= (index + 1) + '. ' + formatTask(task, data.currentSprintProjectId) %>
    <% }); %>
    <% if (_.isEmpty(data.tasks['In Progress']) && !_.isEmpty(data.tasks['To Do'])) { %><Please pick a new task before running the script again><% } %>
    <% if (_.isEmpty(data.tasks['In Progress']) && _.isEmpty(data.tasks['To Do'])) { %>@jacob New Task Needed <also @ the PM or TPM><% } %>
<% if(!_.isEmpty(data.tasks['pr'])) { %>
    *Assigned to PR Review:*
        <% _.forEach(data.tasks['pr'], function(task, index) { %><%= (index + 1) + '. ' + formatTask(task, data.currentSprintProjectId) %>
        <% }); %>
<% } %>
<% if(!_.isEmpty(data.tasks['qa'])) { %>
    *Assigned to QA Review:*
        <% _.forEach(data.tasks['qa'], function(task, index) { %><%= (index + 1) + '. ' + formatTask(task, data.currentSprintProjectId) %>
        <% }); %>
<% } %>
*Blocked:*
<% if (!_.isEmpty(data.tasks['Blocked'])) { %>
  <% _.forEach(data.tasks['Blocked'], function(section, sectionName) { %><%= sectionName %>:
      <% _.forEach(section, function(task, index) { %><%= (index + 1) + '. ' + formatTask(task, data.currentSprintProjectId) %>
      <% }); %>
  <% }); %>
<% } else { %>
    None
<% } %>
<% if (!_.isEmpty(data.tasks['Done'])) { %>
*Done:*
    <% _.forEach(data.tasks['Done'], function(task, index) { %><%= (index + 1) + '. ' + formatTask(task, data.currentSprintProjectId) %>
    <% }); %>
<% } %>
<% if (!_.isEmpty(data.tasks['To Do'])) { %>
Deprioritised:
    <Note any tasks moved back to "To Do" and why or delete this section>
<% } %>
"""`.trim()
}

export function isCurrentProject(projectName) {
    const match = projectName.match(/Sprint #\d+ - (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/)
    if (!match) return false

    const [_, startDate, endDate] = match
    const today = new Date()
    const start = new Date(startDate)
    //end of final day of sprint
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999) // Set to the end of the day

    return today >= start && today <= end
}

export function groupTasks(tasks, sectionIds, reviewingTasks) {
    let currentTaskSection = ''
    let currentTaskSectionName = ''
    //group tasks by task.memberships[0].section.name
    return tasks.reduce((acc, task) => {
        currentTaskSection = task.memberships.find((membership) => sectionIds.includes(membership.section.gid))
        if (!currentTaskSection) return acc
        currentTaskSectionName = currentTaskSection.section.name
        //if task is blocked, in QA or PR then add to a key called "Blocked"
        //if the due date is in the past then set alert to ':rotating_light:'
        let alertString = ''
        let placeholder = ''
        if (task.due_on) {
            const dueDate = new Date(task.due_on)
            const today = new Date()
            if (dueDate < today) {
                alertString = ' :rotating_light:'
            }
        }
        let taskObject = {
            ...task,
            alertString,
            placeholder,
        }

        if (
            currentTaskSectionName === 'Blocked' ||
            currentTaskSectionName === 'QA' ||
            currentTaskSectionName === 'PR Review' ||
            currentTaskSectionName === 'Due For Release'
        ) {
            //if the task is in the blocked section then add an attribute called 'placeholder' with the text <@ the person who can unblock you>
            if (currentTaskSectionName === 'Blocked') {
                taskObject.placeholder = ' <@ the person who can unblock you>'
            } else if (currentTaskSectionName === 'QA') {
                taskObject.placeholder = atReviewers(task, 'QA Reviewer')
            } else if (currentTaskSectionName === 'PR Review') {
                taskObject.placeholder = atReviewers(task, 'PR Reviewer')
            }
            acc['Blocked'] = acc['Blocked'] || {}
            //push tasks to arrays in the blocked object keyed by the section name
            acc['Blocked'][currentTaskSectionName] = acc['Blocked'][currentTaskSectionName] || []
            acc['Blocked'][currentTaskSectionName].push(taskObject)
        } else if (currentTaskSectionName === 'In Progress') {
            acc['In Progress'] = acc['In Progress'] || []
            acc['In Progress'].push(taskObject)
        } else if (currentTaskSectionName === 'To Do') {
            acc['To Do'] = acc['To Do'] || []
            acc['To Do'].push(taskObject)
        } else if (currentTaskSectionName === 'Done') {
            //if completed in the last 24 hours then add to a key called "Done"
            if (completedInLast24Hours(task)) {
                taskObject.alertString = ' :white_check_mark:'
                acc['Done'] = acc['Done'] || []
                acc['Done'].push(taskObject)
            }
        }
        return acc
    }, reviewingTasks)
}

export function renderStandupNotes(currentSprintProjectId, currentSprintTasks) {
    const template = _.template(standupTemplate())
    let notes = template({
        data: { tasks: currentSprintTasks, currentSprintProjectId },
        formatTask,
    }).trim()
    //remove empty lines
    notes = notes.replace(/^\s*[\r\n]/gm, '')
    return notes
}

/*
 * Because you cannot filter tasks by `people` type custom fields we must manually filter the tasks which I am reviewing
 * In order to only loop once we set both qa and pr tasks in the same loop
 */
export function myTasksToReview(allProjectTasks, prReviewerFieldId, qaReviewerFieldId, myUserId) {
    return allProjectTasks.reduce(
        (acc, task) => {
            task.placeholder = ''
            task.alertString = ''
            const prReviewerIds = task.custom_fields
                .find((field) => field.gid === prReviewerFieldId)
                ?.people_value.map((field) => field.gid)
            const qaReviewerIds = task.custom_fields
                .find((field) => field.gid === qaReviewerFieldId)
                ?.people_value.map((field) => field.gid)
            if (prReviewerIds && prReviewerIds.includes(myUserId)) {
                acc.pr.push(task)
            }
            if (qaReviewerIds && qaReviewerIds.includes(myUserId)) {
                acc.qa.push(task)
            }
            return acc
        },
        { pr: [], qa: [] }
    )
}

function completedInLast24Hours(task) {
    const completedAt = new Date(task.completed_at)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return completedAt > yesterday
}

/*
 * If there is a field called fieldName and the value is a non empty people field then return @name
 * If any of this isn't the case then return <assign a reviewer>
 */
function atReviewers(task, fieldName) {
    let atText = 'assign a reviewer'
    const field = task.custom_fields.find((field) => field.name === fieldName)
    if (field && !_.isEmpty(field.people_value)) {
        atText = field.people_value.reduce((acc, peopleValue) => {
            return acc + `@${peopleValue.name}`
        }, 'Replace the following with the slack usernames: ')
    }
    return ` <${atText}>`
}

//TODO
//lookup slack usernames for @ing
