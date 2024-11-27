import _ from 'lodash'
import { isCurrentProject, groupTasks, renderStandupNotes } from './standup-notes-generator-utils.js'

const RealDate = Date

// Mock the current date to 2024-11-20
global.Date = class extends RealDate {
    constructor(...args) {
        if (args.length === 0) {
            return new RealDate(2024, 10, 20) // Months are 0-indexed
        }
        return new RealDate(...args)
    }
}

const reviewerTasks = {
    pr: [
        {
            gid: '1208796157034810',
            completed_at: null,
            custom_fields: [Array],
            due_on: '2024-11-25',
            memberships: [Array],
            name: 'Setup the app shell',
            placeholder: '',
            alertString: '',
        },
        {
            gid: '1208741072894683',
            completed_at: null,
            custom_fields: [Array],
            due_on: '2024-11-29',
            memberships: [Array],
            name: 'Delivery process tasks - post leave catch up',
            placeholder: '',
            alertString: '',
        },
    ],
    qa: [
        {
            gid: '1208741072894683',
            completed_at: null,
            custom_fields: [Array],
            due_on: '2024-11-29',
            memberships: [Array],
            name: 'Delivery process tasks - post leave catch up',
            placeholder: '',
            alertString: '',
        },
    ],
}

describe('standupTemplate', () => {
    it('should return the correct standup message for given tasks when all are in progress', () => {
        const tasks = [
            {
                gid: '1208741072894673',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009270', name: 'In Progress' } }],
                name: 'Horizon process',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208769083781598',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009270', name: 'In Progress' } }],
                name: 'Delivery process training prep',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894677',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009270', name: 'In Progress' } }],
                name: 'Standup improvements + script',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894681',
                due_on: '2024-11-18',
                memberships: [{ section: { gid: '1208715620009271', name: 'In Progress' } }],
                name: 'Plan sprint 5',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894683',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009270', name: 'In Progress' } }],
                name: 'Delivery process tasks - post leave catch up',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
        ]
        const currentSprintProjectId = '1208715396468323'

        const expectedOutput = `
If the output of this script doesn't look right make any updates needed in Asana and run again.
    - Move tasks to the next workflow stage or blocked, as needed
    - Move tasks back to "To Do" if you are no longer working on them due to a change in priority. Note these in the "Deprioritised" section below with the reason for dropping the task for now.
    - Review and act on, rewrite or delete anything between <ANGLE BRACKETS> as needed. All <ANGLE BRACKETS> placeholders should be removed from your posted notes
Here are your generated notes:
"""
*In Progress:*
    1. *[Horizon process](https://app.asana.com/0/1208715396468323/1208741072894673)* Due: 2024-11-29
    2. *[Delivery process training prep](https://app.asana.com/0/1208715396468323/1208769083781598)* Due: 2024-11-29
    3. *[Standup improvements + script](https://app.asana.com/0/1208715396468323/1208741072894677)* Due: 2024-11-29
    4. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
    *Assigned to PR Review:*
        1. *[Setup the app shell](https://app.asana.com/0/1208715396468323/1208796157034810)* Due: 2024-11-25
        2. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
    *Assigned to QA Review:*
        1. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
*Blocked:*
    None
"""`

        const sections = ['1208715620009270', '1208715620009273', '1208715620009272']
        const groupedTasks = groupTasks(tasks, sections, { ...reviewerTasks })

        const notesText = renderStandupNotes(currentSprintProjectId, groupedTasks)

        expect(notesText).toBe(expectedOutput.trim())
    })
    it('should return the correct standup message for given tasks when some are blocked', () => {
        const tasks = [
            {
                gid: '1208741072894673',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009270', name: 'In Progress' } }],
                name: 'Horizon process',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208769083781598',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009270', name: 'In Progress' } }],
                name: 'Delivery process training prep',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894677',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009270', name: 'In Progress' } }],
                name: 'Standup improvements + script',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894681',
                due_on: '2024-11-18',
                memberships: [{ section: { gid: '1208715620009271', name: 'In Progress' } }],
                name: 'Plan sprint 5',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894683',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009270', name: 'In Progress' } }],
                name: 'Delivery process tasks - post leave catch up',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894681',
                due_on: '2024-11-18',
                memberships: [{ section: { gid: '1208715620009272', name: 'Blocked' } }],
                name: 'Plan sprint 5',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894683',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009273', name: 'PR Review' } }],
                name: 'Delivery process tasks - post leave catch up',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
        ]
        const currentSprintProjectId = '1208715396468323'

        const expectedOutput = `
If the output of this script doesn't look right make any updates needed in Asana and run again.
    - Move tasks to the next workflow stage or blocked, as needed
    - Move tasks back to "To Do" if you are no longer working on them due to a change in priority. Note these in the "Deprioritised" section below with the reason for dropping the task for now.
    - Review and act on, rewrite or delete anything between <ANGLE BRACKETS> as needed. All <ANGLE BRACKETS> placeholders should be removed from your posted notes
Here are your generated notes:
"""
*In Progress:*
    1. *[Horizon process](https://app.asana.com/0/1208715396468323/1208741072894673)* Due: 2024-11-29
    2. *[Delivery process training prep](https://app.asana.com/0/1208715396468323/1208769083781598)* Due: 2024-11-29
    3. *[Standup improvements + script](https://app.asana.com/0/1208715396468323/1208741072894677)* Due: 2024-11-29
    4. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
    *Assigned to PR Review:*
        1. *[Setup the app shell](https://app.asana.com/0/1208715396468323/1208796157034810)* Due: 2024-11-25
        2. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
    *Assigned to QA Review:*
        1. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
*Blocked:*
  Blocked:
      1. *[Plan sprint 5](https://app.asana.com/0/1208715396468323/1208741072894681)* Due: 2024-11-18 :rotating_light: <@ the person who can unblock you>
  PR Review:
      1. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29 <Replace the following with the slack usernames: @Jacob Ashdown>
"""`

        const sections = ['1208715620009270', '1208715620009273', '1208715620009272']
        const groupedTasks = groupTasks(tasks, sections, { ...reviewerTasks })

        const notesText = renderStandupNotes(currentSprintProjectId, groupedTasks)

        expect(notesText).toBe(expectedOutput.trim())
    })
    it('should return the correct standup message for given tasks when all are blocked but there is an unstarted task available', () => {
        const tasks = [
            {
                gid: '1208741072894669',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009269', name: 'To Do' } }],
                name: 'To do task',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894681',
                due_on: '2024-11-18',
                memberships: [{ section: { gid: '1208715620009272', name: 'Blocked' } }],
                name: 'Plan sprint 5',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894683',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009273', name: 'PR Review' } }],
                name: 'Delivery process tasks - post leave catch up',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
        ]
        const currentSprintProjectId = '1208715396468323'

        const expectedOutput = `
If the output of this script doesn't look right make any updates needed in Asana and run again.
    - Move tasks to the next workflow stage or blocked, as needed
    - Move tasks back to "To Do" if you are no longer working on them due to a change in priority. Note these in the "Deprioritised" section below with the reason for dropping the task for now.
    - Review and act on, rewrite or delete anything between <ANGLE BRACKETS> as needed. All <ANGLE BRACKETS> placeholders should be removed from your posted notes
Here are your generated notes:
"""
*In Progress:*
    <Please pick a new task before running the script again>
    *Assigned to PR Review:*
        1. *[Setup the app shell](https://app.asana.com/0/1208715396468323/1208796157034810)* Due: 2024-11-25
        2. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
    *Assigned to QA Review:*
        1. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
*Blocked:*
  Blocked:
      1. *[Plan sprint 5](https://app.asana.com/0/1208715396468323/1208741072894681)* Due: 2024-11-18 :rotating_light: <@ the person who can unblock you>
  PR Review:
      1. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29 <Replace the following with the slack usernames: @Jacob Ashdown>
Deprioritised:
    <Note any tasks moved back to "To Do" and why or delete this section>
"""`

        const sections = ['1208715620009270', '1208715620009273', '1208715620009272', '1208715620009269']
        const groupedTasks = groupTasks(tasks, sections, { ...reviewerTasks })

        const notesText = renderStandupNotes(currentSprintProjectId, groupedTasks)

        expect(notesText).toBe(expectedOutput.trim())
    })
    it('should return the correct standup message for given tasks when all are blocked but there are no unstarted tasks available', () => {
        const tasks = [
            {
                gid: '1208741072894681',
                due_on: '2024-11-18',
                memberships: [{ section: { gid: '1208715620009272', name: 'Blocked' } }],
                name: 'Plan sprint 5',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
            {
                gid: '1208741072894683',
                due_on: '2024-11-29',
                memberships: [{ section: { gid: '1208715620009273', name: 'PR Review' } }],
                name: 'Delivery process tasks - post leave catch up',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
        ]
        const currentSprintProjectId = '1208715396468323'

        const expectedOutput = `
If the output of this script doesn't look right make any updates needed in Asana and run again.
    - Move tasks to the next workflow stage or blocked, as needed
    - Move tasks back to "To Do" if you are no longer working on them due to a change in priority. Note these in the "Deprioritised" section below with the reason for dropping the task for now.
    - Review and act on, rewrite or delete anything between <ANGLE BRACKETS> as needed. All <ANGLE BRACKETS> placeholders should be removed from your posted notes
Here are your generated notes:
"""
*In Progress:*
    @jacob New Task Needed <also @ the PM or TPM>
    *Assigned to PR Review:*
        1. *[Setup the app shell](https://app.asana.com/0/1208715396468323/1208796157034810)* Due: 2024-11-25
        2. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
    *Assigned to QA Review:*
        1. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29
*Blocked:*
  Blocked:
      1. *[Plan sprint 5](https://app.asana.com/0/1208715396468323/1208741072894681)* Due: 2024-11-18 :rotating_light: <@ the person who can unblock you>
  PR Review:
      1. *[Delivery process tasks - post leave catch up](https://app.asana.com/0/1208715396468323/1208741072894683)* Due: 2024-11-29 <Replace the following with the slack usernames: @Jacob Ashdown>
"""`

        const sections = ['1208715620009270', '1208715620009273', '1208715620009272', '1208715620009269']
        const groupedTasks = groupTasks(tasks, sections, { ...reviewerTasks })

        const notesText = renderStandupNotes(currentSprintProjectId, groupedTasks)
        console.log(notesText)

        expect(notesText).toBe(expectedOutput.trim())
    })
    it('should return the correct standup message for tasks completed in the last 24 hours', () => {
        const tasks = [
            {
                gid: '1208741072894673',
                due_on: '2024-11-20',
                completed_at: new Date(2024, 10, 19, 12, 0, 0).toISOString(), // Completed on 2024-11-19
                memberships: [{ section: { gid: '1208715620009274', name: 'Done' } }],
                name: 'Completed task',
                custom_fields: [
                    {
                        name: 'PR Reviewer',
                        people_value: [
                            {
                                gid: '1207642806472591',
                                name: 'Jacob Ashdown',
                                resource_type: 'user',
                            },
                        ],
                        type: 'people',
                    },
                    {
                        name: 'QA Reviewer',
                        people_value: [],
                        type: 'people',
                    },
                ],
            },
        ]
        const currentSprintProjectId = '1208715396468323'

        const expectedOutput = `
If the output of this script doesn't look right make any updates needed in Asana and run again.
    - Move tasks to the next workflow stage or blocked, as needed
    - Move tasks back to "To Do" if you are no longer working on them due to a change in priority. Note these in the "Deprioritised" section below with the reason for dropping the task for now.
    - Review and act on, rewrite or delete anything between <ANGLE BRACKETS> as needed. All <ANGLE BRACKETS> placeholders should be removed from your posted notes
Here are your generated notes:
"""
*In Progress:*
    @jacob New Task Needed <also @ the PM or TPM>
*Blocked:*
    None
*Done:*
    1. *[Completed task](https://app.asana.com/0/1208715396468323/1208741072894673)* Due: 2024-11-20 :white_check_mark:
"""`

        const sections = ['1208715620009274']
        const groupedTasks = groupTasks(tasks, sections, { qa: [], pr: [] })

        const notesText = renderStandupNotes(currentSprintProjectId, groupedTasks)

        expect(notesText).toBe(expectedOutput.trim())
    })
})
describe('isCurrentProject', () => {
    it('should return true for a project with a current date range', () => {
        const projectName = 'Sprint #5 - 2024-11-15 to 2024-11-25'
        expect(isCurrentProject(projectName)).toBe(true)
    })

    it('should return false for a project with a past date range', () => {
        const projectName = 'Sprint #4 - 2024-10-01 to 2024-10-15'
        expect(isCurrentProject(projectName)).toBe(false)
    })

    it('should return false for a project with a future date range', () => {
        const projectName = 'Sprint #6 - 2024-12-01 to 2024-12-15'
        expect(isCurrentProject(projectName)).toBe(false)
    })

    it('should return false for a project name that does not match the expected format', () => {
        const projectName = 'Sprint #7 - No Dates'
        expect(isCurrentProject(projectName)).toBe(false)
    })
})
