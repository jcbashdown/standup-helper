import Asana from 'asana'
import dotenv from 'dotenv'

import { isCurrentProject, groupTasks, renderStandupNotes, myTasksToReview } from './standup-notes-generator-utils.js'

// Load environment variables from a .env file
dotenv.config()
const { ASANA_USER_ID, ASANA_WORKSPACE_ID, ASANA_PERSONAL_ACCESS_TOKEN, ASANA_TEAM_ID } = process.env

const asanaApiClient = Asana.ApiClient.instance
const token = asanaApiClient.authentications['token']
token.accessToken = ASANA_PERSONAL_ACCESS_TOKEN

const tasksApiInstance = new Asana.TasksApi()
const projectsApiInstance = new Asana.ProjectsApi()
const sectionsApiInstance = new Asana.SectionsApi()

async function getTeamProjects(teamId, apiInstance) {
    const opts = {}
    return await apiInstance.getProjectsForTeam(teamId, opts)
}

async function getProjectSections(projectId, apiInstance) {
    const opts = {}
    return await apiInstance.getSectionsForProject(projectId, opts)
}

async function fetchTodaysTasks(workspaceId, currentProjectId, userId, apiInstance) {
    if (!currentProjectId) {
        console.log('No current project found.')
        return
    }

    const opts = {
        completed: false,
        'assignee.any': userId,
        'projects.any': currentProjectId,
        opt_fields: 'name,due_on,memberships.section.name,completed_at,custom_fields',
    }
    return await apiInstance.searchTasksForWorkspace(workspaceId, opts)
}

async function fetchAllProjectTasks(workspaceId, currentProjectId, apiInstance) {
    if (!currentProjectId) {
        console.log('No current project found.')
        return
    }

    const opts = {
        completed: false,
        'projects.any': currentProjectId,
        opt_fields: 'name,due_on,memberships.section.name,completed_at,custom_fields',
    }
    return await apiInstance.searchTasksForWorkspace(workspaceId, opts)
}

const projects = (await getTeamProjects(ASANA_TEAM_ID, projectsApiInstance)).data

const { gid: currentProjectId } = projects.find((project) => isCurrentProject(project.name))

const sections = (await getProjectSections(currentProjectId, sectionsApiInstance)).data

const sectionIds = sections.map((section) => section.gid)

const todaysTasksResults = await fetchTodaysTasks(ASANA_WORKSPACE_ID, currentProjectId, ASANA_USER_ID, tasksApiInstance)

//get the field id of the PR Reviewer custom field
const prReviewerFieldId = todaysTasksResults.data[0].custom_fields.find((field) => field.name === 'PR Reviewer').gid
//get the field id of the QA Reviewer custom field
const qaReviewerFieldId = todaysTasksResults.data[0].custom_fields.find((field) => field.name === 'QA Reviewer').gid

const allProjectTasks = await fetchAllProjectTasks(ASANA_WORKSPACE_ID, currentProjectId, tasksApiInstance)

const reviewingTasks = myTasksToReview(allProjectTasks.data, prReviewerFieldId, qaReviewerFieldId, ASANA_USER_ID)

const groupedTasks = groupTasks(todaysTasksResults.data, sectionIds, reviewingTasks)

console.log(renderStandupNotes(currentProjectId, groupedTasks, reviewingTasks))
