# VM Deployment

This project is deployed on an Azure Ubuntu VM and managed with `pm2`.

The main services are:
- `Craig`: Discord bot
- `Craig Dashboard`: dashboard app
- `craig.horse`: recording download web app
- `Craig Tasks`: background jobs, including transcript generation

## 1. SSH into the VM

```bash
ssh -i ~/.ssh/id_ed25519 azureuser@<VM_PUBLIC_IP>
```

## 2. Go to the repo

```bash
cd ~/craig
```

## 3. First-time deploy or full rebuild

Use this when:
- setting up a fresh VM
- changing `install.config`
- rotating the Discord bot token
- adding new env vars
- needing to regenerate runtime config files

```bash
cd ~/craig
./install.sh -f
```

This will:
- regenerate `.env` files
- regenerate runtime config such as `apps/bot/config/default.js`
- install/build dependencies
- run Prisma deploy
- rebuild apps
- start services with `pm2`

## 4. Standard re-deploy after code changes

Use this for normal code changes when `install.config` has not changed.

```bash
cd ~/craig
git fetch origin
git pull --ff-only origin <branch-name>

source ~/.nvm/nvm.sh
nvm use 18.18.2

yarn install --frozen-lockfile
yarn prisma:deploy
yarn --cwd apps/bot build
yarn --cwd apps/dashboard build
yarn --cwd apps/download build
yarn --cwd apps/tasks build

pm2 restart "Craig" "Craig Dashboard" "craig.horse" "Craig Tasks" --update-env
pm2 save
```

## 5. Faster partial re-deploys

If only one app changed, rebuild and restart just that app.

### Bot only

```bash
cd ~/craig
git pull --ff-only origin <branch-name>
source ~/.nvm/nvm.sh
nvm use 18.18.2
yarn --cwd apps/bot build
pm2 restart "Craig" --update-env
```

### Dashboard only

```bash
cd ~/craig
git pull --ff-only origin <branch-name>
source ~/.nvm/nvm.sh
nvm use 18.18.2
yarn --cwd apps/dashboard build
pm2 restart "Craig Dashboard" --update-env
```

### Download page / recording web UI only

```bash
cd ~/craig
git pull --ff-only origin <branch-name>
source ~/.nvm/nvm.sh
nvm use 18.18.2
yarn --cwd apps/download build
pm2 restart "craig.horse" --update-env
```

### Tasks / transcript worker only

```bash
cd ~/craig
git pull --ff-only origin <branch-name>
source ~/.nvm/nvm.sh
nvm use 18.18.2
yarn --cwd apps/tasks build
pm2 restart "Craig Tasks" --update-env
```

## 6. After changing environment/config

If you change any of these:
- `install.config`
- Discord bot token
- OpenAI API key
- transcript env vars
- API host / homepage / app URI

Run:

```bash
cd ~/craig
./install.sh -f
pm2 restart "Craig" "Craig Dashboard" "craig.horse" "Craig Tasks" --update-env
pm2 save
```

Important:
- The bot runtime uses generated config files such as `apps/bot/config/default.js`.
- Updating `install.config` alone is not enough until config is regenerated.

## 7. Check service status

```bash
pm2 list
pm2 logs "Craig" --lines 50
pm2 logs "Craig Dashboard" --lines 50
pm2 logs "craig.horse" --lines 50
pm2 logs "Craig Tasks" --lines 100
```

## 8. Common verification checks

### Bot status / online presence

```bash
grep -n "state:" ~/craig/apps/bot/config/default.js
pm2 restart "Craig" --update-env
```

### Transcript worker running

```bash
pm2 logs "Craig Tasks" --lines 100
```

Look for:
- `Transcript worker started`

### Website branding not updating

Rebuild and restart the download app:

```bash
yarn --cwd apps/download build
pm2 restart "craig.horse" --update-env
```

Then hard refresh the browser.

## 9. VM recovery notes

If the VM becomes unstable or SSH drops:

1. Restart the VM from Azure.
2. SSH back in.
3. Check health:

```bash
uptime
free -h
df -h
pm2 list
```

4. If needed:

```bash
pm2 resurrect
```

If the VM is memory-constrained, keep `craig.horse` scaled low:

```bash
pm2 scale craig.horse 1
pm2 save
```

## 10. Useful git commands

Current branch:

```bash
git branch --show-current
```

Latest commit:

```bash
git log -1 --oneline
```

Latest remote commit on a branch:

```bash
git fetch origin
git log -1 --oneline origin/<branch-name>
```

## 11. Recommended default re-deploy command

If unsure, use this:

```bash
cd ~/craig
git fetch origin
git pull --ff-only origin <branch-name>
source ~/.nvm/nvm.sh
nvm use 18.18.2
yarn install --frozen-lockfile
yarn prisma:deploy
yarn --cwd apps/bot build
yarn --cwd apps/dashboard build
yarn --cwd apps/download build
yarn --cwd apps/tasks build
pm2 restart "Craig" "Craig Dashboard" "craig.horse" "Craig Tasks" --update-env
pm2 save
```
