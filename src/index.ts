import { App } from "@slack/bolt";
import { rotateConfigToken } from "./tokens";
import { setupApp } from "./views";

require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

setupApp(app);

(async () => {
    await app.start();
    console.log('⚡️ Bolt app is running!');
    await rotateConfigToken(app);
    setInterval(rotateConfigToken, 10 * 60 * 60 * 1000);
})();