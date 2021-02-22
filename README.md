# ff-backup

Local (as in "runs on your computer") backup tool for Freefeed. Will download all posts written by you (including direct messages and posts to groups) with attachments, and generate a simple HTML document to view them.

## How to use

Prerequisites: [NodeJS](https://nodejs.org/en/), [git](https://git-scm.com/downloads).

1. Clone this repo
1. Generate an application token [here](https://freefeed.net/settings/app-tokens/create?title=ff-backup&scopes=read-my-info%20read-feeds). Put your username and app token into `credentials.json`
1. Run `npm run start` and wait for it to complete

Downloading all of your data and attachments might take quite a bit of time, depending on the size of your feed and your geographical location (Europe is fastest). The script is tolerant to interruptions, and will continue if restarted. You can backup as many users as you want from as many servers as you want, and the backups will be kept in separate folders.

To refresh your backup delete all .json files from your backup data folder and re-run `npm run start`. You can keep the attachments and profilepics folders to avoid re-downloading them.

## Known limitations

The tool doesn't have complete feature parity with the official client when it comes to rendering of posts and comments. For example, #hashtags, @username mentions, and comment ^^ arrows are displayed as plain text, there are no user popups, and there is no "lightbox" for attachments. This is intentional and is unlikely to be fixed.

## Using with other instances

This tool is configured to work with https://freefeed.net by default. To run the script against other Freefeed instances (e.g. candy or your local dev server) update server configuration in `config.json`. Note that you will need an app token with the following access rights: `Read my public profile`, `Read my user information`, and `Read feeds, including my feeds and direct messages`, issued by that server.
