# My Availability App

I built this simple scheduling web app so I could easily share my availability with my manager. I got tired of sending emails or text messages every week with my schedule, so I created this lightweight tool.

## Purpose
The goal here is simplicity. I can log in, click the days I'm available or unavailable, add small notes if I need to (like "after 2pm"), and just share the link. Viewers don't need to log in to see my schedule, making it zero-friction for whoever needs to check when I'm free.

## How it works
- **Mongo DB:** I tried setting it up with no database originally, but most hosting sites require payment plans to utilize that. So I went with MongoDB as my database.
- **Private Editing:** I lock the editing side behind a single passcode. 
- **Bug Reporting:** I hooked up a Discord webhook so if someone has an issue with the page, they can send a bug report straight to my phone.
- **Themes:** It has a light and dark mode because I stare at screens all day and my eyes need a break.

That's it. It's just a personal tool I threw together to solve a specific problem in my life.
