# Marketing Masters

A live, in-class, multi-device game-show for revising the **Product Life Cycle** and the **Marketing Mix (4 Ps)**.

Groups join from any device with a 4-letter room code, get a random product, and race through Introduction → Growth → Maturity → Decline → Extension stages, choosing pricing & promotion strategies and justifying their choices. Top groups face off in a **Final Boss** pitch round voted on by the class.

Features: live leaderboard, sound effects, sabotage / hint / freeze / peek power-ups, Final Boss tiebreaker, printable PDF summaries.

---

## What you need to run it

1. A free **Firebase** project (5 min to set up, no credit card)
2. A free **GitHub** account with a public repo (5 min)
3. That's it — students just open the URL in any browser.

---

## Step 1 — Set up Firebase (one-time, ~5 minutes)

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. Click **Add project**. Name it anything (e.g. `marketing-masters`). You can skip Google Analytics.
3. In the left sidebar, click **Build → Realtime Database → Create database**.
   - Choose a location near you (e.g. Singapore for Bangkok).
   - Start in **test mode**. (We'll tighten the rules below.)
4. Once it's created, click the **Rules** tab and paste this in, then click **Publish**:

   ```json
   {
     "rules": {
       "rooms": {
         "$roomId": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```

   These rules let any device read/write rooms — fine for a classroom game. (You can lock it down further later if you want.)

5. Click the gear icon next to **Project Overview → Project settings**.
6. Scroll to **Your apps**, click the `</>` (web) icon, give it a nickname like `marketing-masters-web`, click **Register app**.
7. Copy the `firebaseConfig` block it shows you. It looks like:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "marketing-masters-xxxx.firebaseapp.com",
     databaseURL: "https://marketing-masters-xxxx-default-rtdb.firebaseio.com",
     projectId: "marketing-masters-xxxx",
     // (other fields can be ignored)
   };
   ```

8. Open `firebase-config.js` in this project and paste your values in. **Save.**

   > ⚠️ Make sure `databaseURL` is included — it's the one Firebase sometimes hides by default. If you don't see it in the snippet, get it from **Realtime Database → Data tab** (the URL at the top, ending in `.firebaseio.com`).

---

## Step 2 — Push to GitHub Pages (one-time, ~5 minutes)

1. Create a new public repo on GitHub, e.g. `marketing-masters`.
2. Upload **all** these files into the root of the repo:
   - `index.html`
   - `style.css`
   - `app.js`
   - `firebase-config.js` (with your config pasted in)
   - `products.js`
   - `README.md`
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to `Deploy from a branch`, **Branch** to `main` and `/ (root)`, then **Save**.
5. After a minute or so, GitHub will give you a URL like:

   ```
   https://YOUR-USERNAME.github.io/marketing-masters/
   ```

That's the link you share with students. Bookmark it.

---

## Step 3 — Run it in class

**On your laptop (the projector):**
1. Open the URL.
2. Click **HOST**.
3. The 4-letter **room code** appears at the top — show this to the class.

**Each group (one device per group of 3):**
1. Open the same URL.
2. Click **JOIN**.
3. Type the room code, type a group name (e.g. *Team Apple*), click **Join Game**.
4. They see their assigned product and wait.

**You (teacher):**
1. When everyone's joined, click **▶ START GAME**.
2. The first stage (**Introduction**) unlocks for 3 minutes.
3. Watch the live answer tiles fill in. After the timer, click **NEXT STAGE →**.
4. Repeat through Growth → Maturity → Decline → Extension.
5. After Extension, click **→ FINAL BOSS**. The top 3 scoring groups each get 60s to pitch a mystery product. The rest of the class votes. Winner gets +250.
6. Click **🖨 PRINT GROUP SUMMARIES** to print/save-PDF each group's completed grid for their books.

---

## Editing the game

You can change anything by editing the JS files — no build step.

- **Product list** → `products.js`, top of file (`PRODUCTS`).
- **Pricing / promotion / extension options** → `products.js`.
- **Stage durations** → `products.js`, in `STAGES` (`durationMs` field, default 180000 = 3 minutes).
- **Power-up costs** → `products.js`, `POWERUP_COSTS`.
- **Hint text** → `products.js`, `HINTS`.
- **Final boss mystery products** → `products.js`, `FINAL_BOSS_PRODUCTS`.
- **Visual style** → `style.css`. The `:root { --pink, --blue, --yellow, ... }` colour variables at the top control the whole palette.

After editing, just `git push` again — GitHub Pages updates within a minute.

---

## Troubleshooting

**"Firebase not configured" warning on the landing page** — you haven't pasted your config into `firebase-config.js`, or you missed the `databaseURL` line.

**Students can't join** — make sure your Firebase Realtime Database **Rules** are published (Step 1.4). If rules are still set to `auth != null`, joins will silently fail.

**Sound not playing** — most browsers require a click before audio starts. The first button press unlocks audio. Use the 🔊 icon in the teacher bar to mute.

**Groups see "Room not found"** — codes are case-insensitive but must be exactly 4 characters and the host must still have the page open (the host page is what holds the room "alive" by listening — Firebase keeps the data either way, but if the host closes the tab the game can't be advanced).

**Want to lock down the database** — once you trust the workflow, replace the rules with:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".validate": "$roomId.matches(/^[A-Z2-9]{4}$/)"
      }
    }
  }
}
```

This at least prevents random people from creating differently-named keys.

---

## Cost

Firebase free tier (Spark plan):
- 100 simultaneous connections — easily enough for 30+ student devices
- 1 GB stored — game data is tiny (<10 KB per game)
- 10 GB/month transfer

You will not hit any of these limits unless you run dozens of classes per day.

GitHub Pages free tier: 1 GB site, 100 GB/month bandwidth — also nowhere near the cap.

---

Have fun! Feedback / improvements welcome.
