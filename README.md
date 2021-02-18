# ff-backup

Local (as in "runs on your computer") backup tool for Freefeed. Will download all posts written by you (including direct messages and posts to groups) with attachments, and generate a simple HTML document to view them.

1. Clone this repo
1. Create an application token by clicking [here](https://freefeed.net/settings/app-tokens/create?title=ff-backup&scopes=read-my-info%20read-feeds). Add your username and app token into `credentials.json`
1. Run `npm run start` and wait for it to complete

Downloading all of your data and attachments might take quite a bit of time, depending on the size of your feed and your geographical location (Europe is fastest). The script is tolerant to interruptions, and will continue if restarted. You can backup as many users as you want from as many servers as you want, and the backups will be kept in separate folders.

To refresh your backup delete all .json files from your backup data folder and re-run `npm run start`. You can keep the attachments and profilepics folders to avoid re-downloading them.

To run the script against other servers (e.g. candy), update your server configuration in `config.json`. Note that you will need an app token with the following access rights: `Read my public profile`, `Read my user information`, and `Read feeds, including my feeds and direct messages`, issued by that server.
