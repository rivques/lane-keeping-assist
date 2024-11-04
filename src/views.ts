import { ViewSubmitAction } from "@slack/bolt";
import { accessToken } from "./tokens";


export function setupApp(app) {
    app.command('/create-app', async ({ ack, body, client }) => {
        ack();
        // open a modal with the app creation form
        try {
            const result = await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'create-app-stage-1',
                    title: {
                        type: 'plain_text',
                        text: 'Create a new app'
                    },
                    blocks: [
                        {
                            type: 'section',
                            block_id: 'configuration-type',
                            text: {
                                type: 'mrkdwn',
                                text: 'Configuration type'
                            },
                            accessory: {
                                type: 'radio_buttons',
                                action_id: 'configuration-type',
                                options: [
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: 'Configure later (with Slack GUI)'
                                        },
                                        value: 'configure-later'
                                    },
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: 'Configure now (with manifest)'
                                        },
                                        value: 'configure-now'
                                    }
                                ]
                            },
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Next'
                    }
                }
            });
        } catch (error) {
            console.error("Error when opening modal:");
            console.error(error);
        }
    });
    app.action('configuration-type', async ({ ack }) => {
        ack();
    });
    app.view('create-app-stage-1', async ({ ack, body, view, client }) => {
        ack();
        // if they configure later, just ask for the app name; if they configure now, ask for the manifest
        const configurationType = view.state.values['configuration-type']['configuration-type'].selected_option.value;
        console.log(`Got stage 1 request. Configuration type: ${configurationType}`);
        if (configurationType === 'configure-later') {
            try {
                await client.views.open({
                    trigger_id: (body as ViewSubmitAction).trigger_id,
                    view: {
                        type: 'modal',
                        callback_id: 'create-app',
                        title: {
                            type: 'plain_text',
                            text: 'Create a new app'
                        },
                        blocks: [
                            {
                                type: 'input',
                                block_id: 'app-name',
                                element: {
                                    type: 'plain_text_input',
                                    action_id: 'app-name'
                                },
                                label: {
                                    type: 'plain_text',
                                    text: 'App name'
                                }
                            }
                        ],
                        submit: {
                            type: 'plain_text',
                            text: 'Create App'
                        }
                    }
                });
                console.log("Opened modal for app name input.");
            } catch (error) {
                console.error("Error when opening modal:");
                console.error(error);
            }
        } else {
            try {
                await client.views.open({
                    trigger_id: (body as ViewSubmitAction).trigger_id,
                    view: {
                        type: 'modal',
                        callback_id: 'create-app',
                        title: {
                            type: 'plain_text',
                            text: 'Create a new app'
                        },
                        blocks: [
                            {
                                type: 'input',
                                block_id: 'manifest',
                                element: {
                                    type: 'plain_text_input',
                                    action_id: 'manifest-edit',
                                    multiline: true,
                                    placeholder: {
                                        type: 'plain_text',
                                        text: 'Paste your app manifest here'
                                    }
                                },
                                label: {
                                    type: 'plain_text',
                                    text: 'Manifest'
                                }
                            }
                        ],
                        submit: {
                            type: 'plain_text',
                            text: 'Create App'
                        }
                    }
                });
                console.log("Opened modal for manifest input.");
            } catch (error) {
                console.error("Error when opening modal:");
                console.error(error);
            }
        }
    });
    app.action('app-name', async ({ ack }) => {
        ack();
    });
    app.action('manifest-edit', async ({ ack }) => {
        ack();
    });
    app.view('create-app', async ({ ack, body, view, client }) => {
        // create the app
        let manifest = null;
        if (view.state.values['manifest']) {
            manifest = view.state.values['manifest']['manifest-edit'].value;
        } else {
            manifest = {
                display_information: {
                    name: view.state.values['app-name']['app-name'].value
                }
            };
        }
        // validate the manifest
        let manifestValidationResult = null;
        try {
            manifestValidationResult = await client.apps.manifest.validate({
                token: accessToken,
                manifest
            });
        } catch (error) {
            // reject the manifest
            ack({
                response_action: 'errors',
                errors: {
                    manifest: `Issues validating manifest: ${error}`
                }
            });
            console.log("Error when validating manifest:", error);
            return;
        }
        if (!manifestValidationResult.ok) {
            // manifest is invalid
            ack({
                response_action: 'errors',
                errors: {
                    manifest: `Issues validating manifest: ${manifestValidationResult.errors.join(', ')}`
                }
            });
        }
        console.log("Confirmed manifest is valid.");

        try {
            const result = await client.apps.manifest.create({
                token: accessToken,
                manifest
            });
        } catch (error) {
            ack({
                response_action: 'errors',
                errors: {
                    manifest: `Issues creating app: ${error}`
                }
            });
            console.error("Error when creating app:");
            console.error(error);
        }
        ack({
            response_action: 'clear'
        });
        // TODO: switch from late ack()s to acking post-manifest-validation and sending a dm for further success/failure alerts
        // TODO: add invitations as collaborators
    });
}