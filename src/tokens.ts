import fs from 'fs/promises';

export let refreshToken = null;
export let accessToken = null;

export async function rotateConfigToken(app) {
    console.log("Rotating config token...");
    if (!refreshToken) {
        // we just started up, pull it from the file
        try {
            const token = await fs.readFile('last-token.txt', 'utf-8');
            refreshToken = token;
        } catch (error) {
            console.error("Error when reading config token from file:")
            console.error(error);
            return;
        }
    }
    let result = null;
    try {
        result = await app.client.tooling.tokens.rotate({
            refresh_token: refreshToken
        });
    } catch (error) {
        console.error("Error when rotating config token:")
        console.error(error);
        return;
    }
    refreshToken = result.refresh_token;
    accessToken = result.token;
    console.log("Rotated config token.");
    try {
        await fs.writeFile('last-token.txt', refreshToken);
        console.log("New token written to file.");
    } catch (error) {
        console.error("Error when writing config token to file:")
        console.error(error);
    }
}