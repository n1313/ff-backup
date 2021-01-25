# ff-backup

Local (as in "runs on your computer") backup tool for Freefeed. Will download all posts written by you (including direct messages and posts to groups) with attachments.

1. Clone this repo
1. Update your server configuration in `config.json` if needed
1. Update your user credentials in `credentials.json`
1. Run `npm run start` and wait for it to complete

Downloading all of your data and attachments might take quite a bit of time, depending on the size of your feed and your geographical location (Europe is fastest). The script is tolerant to interruptions, and will continue if restarted. You can backup as many users as you want from as many servers as you want, and the backups will be kept in separate folders.

To refresh your backup delete all .json files from your backup data folder. You can keep the attachments and profilepics folders to avoid re-downloading them.
