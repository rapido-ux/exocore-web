const { spawn } = require('child_process');
const path = require('path');

const exocoreWebDir = path.join(__dirname, 'exocore-web');

function runProcess(command, args, options = {}) {
    const mergedOptions = {
        stdio: 'inherit',
        shell: true,
        ...options
    };

    const child = spawn(command, args, mergedOptions);

    child.on('error', (err) => {
        console.error(`Error starting process "${command} ${args.join(' ')}":`, err);
    });

    child.on('exit', (code, signal) => {
        if (code !== null && code !== 0) {
            console.error(`Process "${command} ${args.join(' ')}" exited with code ${code} and signal ${signal}`);
        }
    });

    return child;
}

async function startServices() {
    try {
        console.log('Running update check...');
        const updateProcess = runProcess('node', ['updates']);
        await new Promise(resolve => updateProcess.on('exit', resolve));

        const buildProcess = runProcess('node', [
            '--trace-warnings',
            '--async-stack-traces',
            'build.js'
        ], { cwd: exocoreWebDir });

        const serverProcess = runProcess('node', [
            '--trace-warnings',
            '--async-stack-traces',
            '-r', 'ts-node/register',
            'index.js'
        ], { cwd: exocoreWebDir });

        process.on('SIGINT', () => {
            console.log('\nShutting down Exocore Web services...');
            buildProcess.kill('SIGINT');
            serverProcess.kill('SIGINT');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.log('\nShutting down Exocore Web services...');
            buildProcess.kill('SIGTERM');
            serverProcess.kill('SIGTERM');
            process.exit(0);
        });

    } catch (error) {
        console.error('An error occurred during service startup:', error);
        process.exit(1);
    }
}

startServices();
