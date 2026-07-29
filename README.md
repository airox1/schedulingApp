# My Availability App

I built this simple scheduling web app so I could easily share my availability with my manager. I got tired of sending emails or text messages every week with my schedule, so I created this lightweight tool.

## Purpose
The goal here is simplicity. I can log in, click the days I'm available or unavailable, add small notes if I need to (like "after 2pm"), and just share the link. Viewers don't need to log in to see my schedule, making it zero-friction for whoever needs to check when I'm free.

## How it works
- **No Database:** I wanted something I could run anywhere without setting up Postgres or Mongo, so everything just saves to a local JSON file (`data.json`).
- **Private Editing:** I lock the editing side behind a single passcode. 
- **Bug Reporting:** I hooked up a Discord webhook so if someone has an issue with the page, they can send a bug report straight to my phone.
- **Themes:** It has a light and dark mode because I stare at screens all day and my eyes need a break.

## Setup
If I ever need to deploy this on a new server, the steps are pretty straightforward:

1. `npm install` to grab the dependencies.
2. `npm run set-passcode` to generate a secure hash for my editing password. It will print out a salt and hash.
3. Create a `.env` file and drop those in:
   ```env
   SESSION_SECRET=some-random-string
   DISPLAY_NAME=Aidan's Availability
   EDIT_PASSCODE_SALT=...
   EDIT_PASSCODE_HASH=...
   DISCORD_WEBHOOK_URL=...
   ```
4. `npm start` to run the server.

That's it. It's just a personal tool I threw together to solve a specific annoyance in my life.
