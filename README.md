# Description

Use this repo to generate your standup notes based on the current sprint in Asana. The generated notes will prompt you to make further manual edits or make updates in Asana as needed. Once you are happy with the result post them in the standup channel!

# Installation

1. Clone this repo
2. Install the dependencies with `yarn install`
3. Copy the `.env.example` file to `.env` and fill in the required values:
    - `ASANA_PERSONAL_ACCESS_TOKEN`: Your Asana Personal Access Token for API access
        - Generate this here: https://app.asana.com/0/my-apps
    - `ASANA_USER_ID`: Your Asana User ID so we can find your tasks
        - You can find this when logged in at https://app.asana.com/api/1.0/users/<my-email@akvo.org> e.g. https://app.asana.com/api/1.0/users/jacob@akvo.org
    - Keep the default values for the other variables - ask for these if not already set in the example file.

# Usage

Run the script with `yarn generate-notes` and follow the instructions in the output including ensuring anyone @ed has been edited to use their slack username

When you are happy with the result, post the notes in the standup channel. Before sending, you should see a prompt for Slack to render the markdown. Make sure it is enabled before sending.

Post your notes under the reminder at the top level - not in a channel. This way your team mates can ask questions in a thread under your notes.

# Test

run `yarn test` to run the tests
