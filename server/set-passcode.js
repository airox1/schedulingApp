const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPasscode } = require('./auth');

const ENV_PATH = path.join(__dirname, '..', '.env');
const MIN_LENGTH = 8;

const ENTER_CODES = [10, 13]; // \n, \r
const CTRL_C_CODE = 3;
const EOF_CODE = 4; // Ctrl+D
const BACKSPACE_CODES = [8, 127]; // \b, DEL

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error('This script needs an interactive terminal to read the passcode securely.'));
      return;
    }
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let input = '';
    let done = false;
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (done) break;
        const code = ch.charCodeAt(0);

        if (ENTER_CODES.includes(code)) {
          done = true;
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(input);
        } else if (code === CTRL_C_CODE || code === EOF_CODE) {
          process.stdout.write('\n');
          process.exit(1);
        } else if (BACKSPACE_CODES.includes(code)) {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += ch;
          process.stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });
}

function updateEnvFile(updates) {
  let lines = [];
  if (fs.existsSync(ENV_PATH)) {
    lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  }

  const keysToRemove = new Set(['EDIT_PASSCODE', ...Object.keys(updates)]);
  const filtered = lines.filter((line) => {
    const match = line.match(/^([A-Z_]+)=/);
    return !(match && keysToRemove.has(match[1]));
  });

  while (filtered.length && filtered[filtered.length - 1].trim() === '') {
    filtered.pop();
  }

  for (const [key, value] of Object.entries(updates)) {
    filtered.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_PATH, filtered.join('\n') + '\n');
}

async function main() {
  console.log("Set your editing passcode. It's hashed before being saved -- nothing readable is stored.\n");

  const passcode = await promptHidden(`Enter a new passcode (min ${MIN_LENGTH} characters): `);
  if (passcode.length < MIN_LENGTH) {
    console.error(`\nPasscode must be at least ${MIN_LENGTH} characters. Nothing was changed.`);
    process.exitCode = 1;
    return;
  }

  const confirm = await promptHidden('Confirm passcode: ');
  if (confirm !== passcode) {
    console.error('\nPasscodes did not match. Nothing was changed.');
    process.exitCode = 1;
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPasscode(passcode, salt).toString('hex');

  updateEnvFile({
    EDIT_PASSCODE_SALT: salt,
    EDIT_PASSCODE_HASH: hash,
  });

  console.log('\nPasscode saved to .env (as a salted hash, not plaintext).');
  console.log('Restart the server for it to take effect.');
}

main();
