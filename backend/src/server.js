import http from 'http';

import env from './config/env.js';
import connectDB from './config/dbConfig.js';
import app from './app.js';
import { initSocket } from './realtime/socket.js';
import { describeMailSetup } from './config/mailer.js';

/**
 * Process entry point.
 *
 * This module is the only place that binds a port or opens a DB connection.
 * Handlers that need to push over Socket.io import ./realtime/socket.js
 * instead of importing this file — the old arrangement (messageController
 * importing `io` from server.js) meant loading a route started a server.
 */
const server = http.createServer(app);
initSocket(server);

const start = async () => {
    await connectDB();
    server.listen(env.PORT, () => {
        console.log(`Chattrix API listening on http://localhost:${env.PORT}`);

        // A CORS misconfiguration is otherwise invisible from the server side:
        // the request succeeds, the response simply carries no CORS header, and
        // the browser blocks it with nothing written to the log. Printing the
        // parsed list turns "the site mysteriously cannot reach the API" into
        // one glance at the deploy log.
        console.log(
            `CORS allow-list (${env.corsOrigins.length}): ${env.corsOrigins.join(', ') || '(empty — every cross-origin request will be blocked)'}`
        );
        if (env.corsOrigins.length === 0) {
            console.warn('CORS_ORIGINS parsed to nothing. Check the value set in the environment.');
        }

        // Which provider is live, and whether it can actually reach a real
        // inbox. A sandbox host silently captures mail rather than delivering
        // it, which looks identical to "mail is broken" from the outside.
        console.log(describeMailSetup());
    });
};

start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
});

const shutdown = (signal) => () => {
    console.log(`\n${signal} received, shutting down`);
    server.close(() => process.exit(0));
    // Don't let a hung connection block the exit forever.
    setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));

export default server;
