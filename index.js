require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");

/* ═══════════════════════════════════════
   NICOLAS ULTRA XMD V3
═══════════════════════════════════════ */

const BOT_NAME = "NICOLAS ULTRA XMD";
const VERSION = "3.0.0";
const PREFIX = ".";

const AUTH_DIR =
  process.env.AUTH_DIR ||
  "/app/auth_info_baileys";

const OWNER_NAME = "Nicolas";
const OWNER_NUMBER = "242067904938";
const OWNER_JID =
  `${OWNER_NUMBER}@s.whatsapp.net`;

const OWNER_TELEGRAM = "@Sage_ou_Nicolas";

/* ═══════════════════════════════════════
   THEMES
═══════════════════════════════════════ */

const THEMES = [
  "solo",
  "naruto",
  "onepiece",
  "bleach",
  "demon",
  "dragonball",
  "jujutsu",
  "aot",
  "hxh",
  "blackclover"
];

/* ═══════════════════════════════════════
   IMAGES OFFICIELLES NICOLAS
═══════════════════════════════════════ */

const OFFICIAL_IMAGES = {

  menu:
    "https://k.top4top.io/p_3908er0dq1.jpg",

  extra: [
    "https://d.top4top.io/p_3908obklo1.jpg",
    "https://g.top4top.io/p_3908zypj21.jpg",
    "https://l.top4top.io/p_3908fnurj1.jpg",
    "https://g.top4top.io/p_39084ldec1.jpg",
    "https://l.top4top.io/p_3908v7w381.jpgr"
  ],

  welcome:
    "https://j.top4top.io/p_3908uvx8h1.jpg",

  goodbye:
    "https://a.top4top.io/p_3908mjw7j1.jpg",

  ping:
    "https://f.top4top.io/p_3908b1cay1.jpg",

  alive:
    "https://k.top4top.io/p_3908fwts41.jpg"
};

const THEME_IMAGES = {

  solo: OFFICIAL_IMAGES,
  naruto: OFFICIAL_IMAGES,
  onepiece: OFFICIAL_IMAGES,
  bleach: OFFICIAL_IMAGES,
  demon: OFFICIAL_IMAGES,
  dragonball: OFFICIAL_IMAGES,
  jujutsu: OFFICIAL_IMAGES,
  aot: OFFICIAL_IMAGES,
  hxh: OFFICIAL_IMAGES,
  blackclover: OFFICIAL_IMAGES
};

/* ═══════════════════════════════════════
   DOSSIERS DE DONNÉES
═══════════════════════════════════════ */

const DATA_DIR =
  path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {
    recursive: true
  });
}

const DATA_FILES = {

  theme:
    path.join(DATA_DIR, "theme.json"),

  sudo:
    path.join(DATA_DIR, "sudo.json"),

  afk:
    path.join(DATA_DIR, "afk.json"),

  protections:
    path.join(DATA_DIR, "protections.json")
};

/* ═══════════════════════════════════════
   JSON DATABASE
═══════════════════════════════════════ */

function readJSON(file, fallback) {

  try {

    if (!fs.existsSync(file)) {
      return fallback;
    }

    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );

  } catch {

    return fallback;
  }
}

function writeJSON(file, data) {

  try {

    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2)
    );

  } catch (error) {

    console.error(
      "❌ DATABASE ERROR:",
      error.message
    );
  }
}

/* ═══════════════════════════════════════
   ÉTAT GLOBAL
═══════════════════════════════════════ */

const state = {

  theme:
    readJSON(
      DATA_FILES.theme,
      { name: "solo" }
    ).name || "solo",

  sudo:
    readJSON(
      DATA_FILES.sudo,
      []
    ),

  afk:
    readJSON(
      DATA_FILES.afk,
      {}
    ),

  protections:
    readJSON(
      DATA_FILES.protections,
      {}
    )
};

function saveTheme() {

  writeJSON(
    DATA_FILES.theme,
    {
      name: state.theme
    }
  );
}

function saveSudo() {

  writeJSON(
    DATA_FILES.sudo,
    state.sudo
  );
}

function saveAfk() {

  writeJSON(
    DATA_FILES.afk,
    state.afk
  );
}

function saveProtections() {

  writeJSON(
    DATA_FILES.protections,
    state.protections
  );
}

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */

const sleep = ms =>
  new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );

function randomItem(array) {

  return array[
    Math.floor(
      Math.random() * array.length
    )
  ];
}

function jidToNumber(jid = "") {

  return jid
    .split("@")[0]
    .split(":")[0];
}

function normalizeNumber(value = "") {

  return String(value)
    .replace(/\D/g, "");
}

function isGroupJid(jid = "") {

  return jid.endsWith("@g.us");
}

function getSenderJid(message) {

  return (
    message?.key?.participant ||
    message?.key?.remoteJid ||
    ""
  );
}

function isOwner(jid) {

  return (
    normalizeNumber(
      jidToNumber(jid)
    ) ===
    normalizeNumber(
      OWNER_NUMBER
    )
  );
}

function isSudo(jid) {

  const number =
    normalizeNumber(
      jidToNumber(jid)
    );

  return state.sudo.includes(number);
}

function hasOwnerAccess(jid) {

  return (
    isOwner(jid) ||
    isSudo(jid)
  );
}

/* ═══════════════════════════════════════
   TEXTE DES MESSAGES
═══════════════════════════════════════ */

function getText(message) {

  const msg =
    message?.message;

  if (!msg) {
    return "";
  }

  return (

    msg.conversation ||

    msg.extendedTextMessage?.text ||

    msg.imageMessage?.caption ||

    msg.videoMessage?.caption ||

    msg.documentMessage?.caption ||

    msg.viewOnceMessage
      ?.message
      ?.imageMessage
      ?.caption ||

    msg.viewOnceMessageV2
      ?.message
      ?.imageMessage
      ?.caption ||

    msg.viewOnceMessage
      ?.message
      ?.videoMessage
      ?.caption ||

    msg.viewOnceMessageV2
      ?.message
      ?.videoMessage
      ?.caption ||

    ""
  );
}

/* ═══════════════════════════════════════
   RÉACTION
═══════════════════════════════════════ */

async function react(
  sock,
  jid,
  message,
  emoji
) {

  try {

    await sock.sendMessage(
      jid,
      {
        react: {
          text: emoji,
          key: message.key
        }
      }
    );

  } catch {}
}

/* ═══════════════════════════════════════
   ENVOI TEXTE
═══════════════════════════════════════ */

async function sendText(
  sock,
  jid,
  text,
  options = {}
) {

  return sock.sendMessage(
    jid,
    {
      text,
      ...options
    }
  );
}

/* ═══════════════════════════════════════
   ENVOI IMAGE
═══════════════════════════════════════ */

async function sendImage(
  sock,
  jid,
  url,
  caption = ""
) {

  try {

    return await sock.sendMessage(
      jid,
      {
        image: {
          url
        },
        caption
      }
    );

  } catch {

    return sendText(
      sock,
      jid,
      caption
    );
  }
}

/* ═══════════════════════════════════════
   THÈME ACTUEL
═══════════════════════════════════════ */

function getCurrentTheme() {

  return (
    THEME_IMAGES[
      state.theme
    ] ||
    OFFICIAL_IMAGES
  );
}

/* ═══════════════════════════════════════
   GROUP ADMINS
═══════════════════════════════════════ */

async function getGroupAdmins(
  sock,
  groupJid
) {

  try {

    const metadata =
      await sock.groupMetadata(
        groupJid
      );

    return metadata.participants
      .filter(
        participant =>
          participant.admin === "admin" ||
          participant.admin === "superadmin"
      )
      .map(
        participant =>
          participant.id
      );

  } catch {

    return [];
  }
}

async function isAdmin(
  sock,
  groupJid,
  userJid
) {

  const admins =
    await getGroupAdmins(
      sock,
      groupJid
    );

  return admins.includes(
    userJid
  );
}

async function isBotAdmin(
  sock,
  groupJid
) {

  try {

    const bot =
      sock.user?.id;

    return await isAdmin(
      sock,
      groupJid,
      bot
    );

  } catch {

    return false;
  }
}

/* ═══════════════════════════════════════
   TARGET @ / MESSAGE RÉPONDU
═══════════════════════════════════════ */

function getTargetJid(
  message,
  args
) {

  const context =
    message
      ?.message
      ?.extendedTextMessage
      ?.contextInfo;

  const mentioned =
    context?.mentionedJid;

  if (mentioned?.length) {
    return mentioned[0];
  }

  if (
    context?.participant &&
    !args[0]?.startsWith("@")
  ) {

    return context.participant;
  }

  if (
    args[0]?.startsWith("@")
  ) {

    return (
      normalizeNumber(args[0]) +
      "@s.whatsapp.net"
    );
  }

  return null;
}

/* ═══════════════════════════════════════
   PROTECTIONS
═══════════════════════════════════════ */

function getProtection(groupJid) {

  if (
    !state.protections[groupJid]
  ) {

    state.protections[groupJid] = {

      antilink: false,

      antilinkAction:
        "delete",

      antipromote: false
    };
  }

  return state.protections[groupJid];
}

/* ═══════════════════════════════════════
   EXTRACTION MÉDIA
═══════════════════════════════════════ */

function extractMedia(message) {

  const root =
    message?.message ||
    message;

  if (!root) {
    return null;
  }

  function scan(object) {

    if (!object) {
      return null;
    }

    for (
      const [key, value] of Object.entries(object)
    ) {

      if (
        [
          "imageMessage",
          "videoMessage",
          "stickerMessage",
          "audioMessage",
          "documentMessage"
        ].includes(key)
      ) {

        return {
          type: key,
          message: value
        };
      }

      if (
        key === "viewOnceMessage" ||
        key === "viewOnceMessageV2" ||
        key === "viewOnceMessageV2Extension"
      ) {

        const result =
          scan(value?.message);

        if (result) {
          return result;
        }
      }

      if (
        key === "ephemeralMessage"
      ) {

        const result =
          scan(value?.message);

        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  const quoted =
    root
      ?.extendedTextMessage
      ?.contextInfo
      ?.quotedMessage;

  return scan(
    quoted || root
  );
}

async function downloadMedia(media) {

  const type =
    media.type.replace(
      "Message",
      ""
    );

  const stream =
    await downloadContentFromMessage(
      media.message,
      type
    );

  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/* ═══════════════════════════════════════
   FANCY
═══════════════════════════════════════ */

const FANCY = [

  [
    "abcdefghijklmnopqrstuvwxyz",
    "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ"
  ],

  [
    "abcdefghijklmnopqrstuvwxyz",
    "𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫"
  ],

  [
    "abcdefghijklmnopqrstuvwxyz",
    "𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃"
  ],

  [
    "abcdefghijklmnopqrstuvwxyz",
    "𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏"
  ],

  [
    "abcdefghijklmnopqrstuvwxyz",
    "𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟"
  ],

  [
    "abcdefghijklmnopqrstuvwxyz",
    "𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣"
  ]
];

function fancy(text, style) {

  const [
    normal,
    styled
  ] =
    FANCY[
      style % FANCY.length
    ];

  return [
    ...String(text)
  ]
    .map(char => {

      const index =
        normal.indexOf(
          char.toLowerCase()
        );

      if (index < 0) {
        return char;
      }

      return styled[index];

    })
    .join("");
}

/* ═══════════════════════════════════════
   MENU
═══════════════════════════════════════ */

let menuStyle = -1;

function menuText() {

  menuStyle =
    (
      menuStyle + 1
    ) %
    FANCY.length;

  const title =
    fancy(
      BOT_NAME,
      menuStyle
    );

  return `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🔥 ${title}
┃ ⚔️ Version ${VERSION}
┃ 🎨 Theme : ${state.theme.toUpperCase()}
╰━━━━━━━━━━━━━━━━━━━━━━╯

🎀 *GENERAL*

${PREFIX}alive
${PREFIX}ping
${PREFIX}speed
${PREFIX}owner
${PREFIX}repo
${PREFIX}menu

👑 *OWNER / STAFF*

${PREFIX}sudo add @user
${PREFIX}sudo del @user
${PREFIX}sudo list
${PREFIX}pair <number>
${PREFIX}purge

👥 *GROUPES*

${PREFIX}add
${PREFIX}ban
${PREFIX}kick
${PREFIX}promote
${PREFIX}demote
${PREFIX}tag
${PREFIX}tagall
${PREFIX}groupinfo
${PREFIX}listadmin
${PREFIX}staff
${PREFIX}link
${PREFIX}revoke
${PREFIX}groupname
${PREFIX}setgdesc
${PREFIX}left

🛡️ *PROTECTION*

${PREFIX}antilink on
${PREFIX}antilink off
${PREFIX}antilink kick
${PREFIX}antilink delete
${PREFIX}antipromote on
${PREFIX}antipromote off
${PREFIX}antipromote status

🧠 *UTILITY*

${PREFIX}afk
${PREFIX}afk list
${PREFIX}fancy
${PREFIX}kiki
${PREFIX}take
${PREFIX}tourl
${PREFIX}ssweb
${PREFIX}getpp
${PREFIX}delete

🎮 *FUN*

${PREFIX}8ball
${PREFIX}coinflip
${PREFIX}roll
${PREFIX}joke
${PREFIX}blague
${PREFIX}compliment
${PREFIX}flirt
${PREFIX}love
${PREFIX}hug
${PREFIX}kiss
${PREFIX}slap
${PREFIX}fact
${PREFIX}truth
${PREFIX}dare
${PREFIX}rps
${PREFIX}math

🎨 *THEMES*

${THEMES
  .map(
    theme =>
      `${PREFIX}theme ${theme}`
  )
  .join("\n")}

${PREFIX}theme off

━━━━━━━━━━━━━━━━━━━━━━
『By nicolas』
`;
}

function purgeText() {

  return `╭━━━〔 🧹 PURGE 🧹 〕━━━╮

1. Creepy
2. Murky
3. Morbius
4. Leonidas
5. Big Deal
6. Mikaelson
7. Killer
8. Ombre
9. Dark
10. SK7
11. Blood
12. Sasaki

╰━━━━━━━━━━━━━━━━━━╯

Bref… Nicolas se rappelle seulement de ces clans-là.
Le reste ? Brefff. 😂🍫🎻`;
}

/* ═══════════════════════════════════════
   SOCKET
═══════════════════════════════════════ */

let sock = null;
let reconnectTimer = null;
let starting = false;
let pairingRequested = false;
let pairingTimeout = null;

/* ═══════════════════════════════════════
   PARSING COMMANDES
═══════════════════════════════════════ */

function parseCommand(text = "") {

  text = String(text).trim();

  if (!text.startsWith(PREFIX)) {
    return null;
  }

  const body =
    text.slice(PREFIX.length).trim();

  if (!body) {
    return null;
  }

  const parts =
    body.split(/\s+/);

  const command =
    parts.shift().toLowerCase();

  return {
    command,
    args: parts,
    text: parts.join(" ")
  };
}

/* ═══════════════════════════════════════
   CONTEXT
═══════════════════════════════════════ */

function getContext(message) {

  return (
    message
      ?.message
      ?.extendedTextMessage
      ?.contextInfo ||
    {}
  );
}

function getQuoted(message) {

  return (
    getContext(message)
      ?.quotedMessage ||
    null
  );
}

function getMentioned(message) {

  return (
    getContext(message)
      ?.mentionedJid ||
    []
  );
}

/* ═══════════════════════════════════════
   FORMAT
═══════════════════════════════════════ */

function formatDuration(ms) {

  const seconds =
    Math.floor(ms / 1000);

  const minutes =
    Math.floor(seconds / 60);

  const hours =
    Math.floor(minutes / 60);

  const days =
    Math.floor(hours / 24);

  if (days > 0) {
    return `${days}j ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

function cleanMention(jid = "") {

  return jidToNumber(jid);
}

/* ═══════════════════════════════════════
   MENTIONS
═══════════════════════════════════════ */

async function sendMention(
  sock,
  jid,
  text,
  mentions = []
) {

  return sendText(
    sock,
    jid,
    text,
    {
      mentions
    }
  );
}

/* ═══════════════════════════════════════
   PERMISSIONS
═══════════════════════════════════════ */

async function requireGroup(
  sock,
  jid,
  sender
) {

  if (!isGroupJid(jid)) {

    await sendText(
      sock,
      jid,
      "❌ Cette commande fonctionne uniquement dans un groupe."
    );

    return false;
  }

  return true;
}

async function requireAdmin(
  sock,
  jid,
  sender
) {

  if (hasOwnerAccess(sender)) {
    return true;
  }

  const admin =
    await isAdmin(
      sock,
      jid,
      sender
    );

  if (!admin) {

    await sendText(
      sock,
      jid,
      "❌ Cette commande est réservée aux admins."
    );

    return false;
  }

  return true;
}

/* ═══════════════════════════════════════
   ALIVE
═══════════════════════════════════════ */

async function handleAlive(
  sock,
  jid
) {

  const image =
    getCurrentTheme().alive;

  await sendImage(
    sock,
    jid,
    image,
`╭━━━〔 🟢 ${BOT_NAME} 〕━━━╮

⚡ Statut : ONLINE
🤖 Version : ${VERSION}
🎨 Theme : ${state.theme.toUpperCase()}
👑 Owner : ${OWNER_NAME}

『By nicolas』 🍫🎻`
  );
}

/* ═══════════════════════════════════════
   PING
═══════════════════════════════════════ */

async function handlePing(
  sock,
  jid
) {

  const start =
    Date.now();

  await react(
    sock,
    jid,
    {
      key: {
        remoteJid: jid,
        fromMe: false,
        id: `${Date.now()}`
      }
    },
    "🏓"
  );

  const latency =
    Date.now() - start;

  await sendImage(
    sock,
    jid,
    getCurrentTheme().ping,
`╭━━━〔 🏓 PING 〕━━━╮

⚡ Latence : ${latency} ms
🤖 ${BOT_NAME}
🔥 Version : ${VERSION}

『By nicolas』 🍫🎻`
  );
}

/* ═══════════════════════════════════════
   SPEED
═══════════════════════════════════════ */

async function handleSpeed(
  sock,
  jid
) {

  const start =
    Date.now();

  await sleep(10);

  const speed =
    Date.now() - start;

  await sendText(
    sock,
    jid,
`╭━━━〔 ⚡ SPEED 〕━━━╮

🚀 Réponse : ${speed} ms
🧠 Moteur : ${BOT_NAME}
🎨 Theme : ${state.theme.toUpperCase()}

『By nicolas』 🍫🎻`
  );
}

/* ═══════════════════════════════════════
   OWNER
═══════════════════════════════════════ */

async function handleOwner(
  sock,
  jid
) {

  await sendText(
    sock,
    jid,
`╭━━━〔 👑 OWNER 〕━━━╮

👤 Nom : ${OWNER_NAME}
📱 WhatsApp :
+${OWNER_NUMBER}

📲 Telegram :
${OWNER_TELEGRAM}

🤖 Bot :
${BOT_NAME}

『By nicolas』 🍫🎻`
  );
}

/* ═══════════════════════════════════════
   REPO
═══════════════════════════════════════ */

async function handleRepo(
  sock,
  jid
) {

  await sendText(
    sock,
    jid,
`╭━━━〔 💻 REPOSITORY 〕━━━╮

🔥 ${BOT_NAME}
⚡ Version : ${VERSION}

🔧 Prefix : ${PREFIX}

『By nicolas』 🍫🎻`
  );
}

/* ═══════════════════════════════════════
   SUDO
═══════════════════════════════════════ */

async function handleSudo(
  sock,
  jid,
  sender,
  args,
  message
) {

  if (!isOwner(sender)) {

    return sendText(
      sock,
      jid,
      "❌ Seul Nicolas peut gérer les sudo."
    );
  }

  const action =
    (args[0] || "").toLowerCase();

  if (action === "list") {

    if (!state.sudo.length) {

      return sendText(
        sock,
        jid,
        "📋 Aucun sudo enregistré."
      );
    }

    const list =
      state.sudo
        .map(
          (number, index) =>
            `${index + 1}. +${number}`
        )
        .join("\n");

    return sendText(
      sock,
      jid,
`╭━━━〔 👑 SUDO 〕━━━╮

${list}

『By nicolas』 🍫🎻`
    );
  }

  const target =
    getTargetJid(
      message,
      args.slice(1)
    );

  if (!target) {

    return sendText(
      sock,
      jid,
`❌ Utilisation :

.sudo add @user
.sudo del @user
.sudo list`
    );
  }

  const number =
    normalizeNumber(
      jidToNumber(target)
    );

  if (action === "add") {

    if (!state.sudo.includes(number)) {

      state.sudo.push(number);

      saveSudo();
    }

    return sendMention(
      sock,
      jid,
      `👑 @${number} est maintenant SUDO de ${BOT_NAME}.`,
      [target]
    );
  }

  if (action === "del") {

    state.sudo =
      state.sudo.filter(
        n => n !== number
      );

    saveSudo();

    return sendMention(
      sock,
      jid,
      `🗑️ @${number} a été retiré des SUDO.`,
      [target]
    );
  }

  return sendText(
    sock,
    jid,
    "❌ Action sudo inconnue."
  );
}

/* ═══════════════════════════════════════
   THEME
═══════════════════════════════════════ */

async function handleTheme(
  sock,
  jid,
  sender,
  args
) {

  if (!hasOwnerAccess(sender)) {

    return sendText(
      sock,
      jid,
      "❌ Seul Nicolas ou un sudo peut changer le thème."
    );
  }

  const requested =
    (
      args[0] ||
      ""
    ).toLowerCase();

  if (requested === "off") {

    state.theme =
      "solo";

    saveTheme();

    return sendImage(
      sock,
      jid,
      OFFICIAL_IMAGES.menu,
`🎨 Thème désactivé.

🔥 ${BOT_NAME}
🎨 Theme : SOLO

Les visuels officiels de Nicolas sont restaurés.

『By nicolas』 🍫🎻`
    );
  }

  if (!THEMES.includes(requested)) {

    return sendText(
      sock,
      jid,
`🎨 THEMES DISPONIBLES :

${THEMES
  .map(
    theme =>
      `${PREFIX}theme ${theme}`
  )
  .join("\n")}

${PREFIX}theme off`
    );
  }

  state.theme =
    requested;

  saveTheme();

  const images =
    getCurrentTheme();

  await sendImage(
    sock,
    jid,
    images.menu,
`🎨 Thème changé !

🔥 ${BOT_NAME}
🌌 Nouveau thème : ${requested.toUpperCase()}

『By nicolas』 🍫🎻`
  );
}

/* ═══════════════════════════════════════
   AFK
═══════════════════════════════════════ */

async function handleAfk(
  sock,
  jid,
  sender,
  args
) {

  const number =
    normalizeNumber(
      jidToNumber(sender)
    );

  const reason =
    args.join(" ").trim() ||
    "Aucune raison.";

  state.afk[number] = {
    reason,
    since: Date.now(),
    mentions: 0
  };

  saveAfk();

  await sendText(
    sock,
    jid,
`😴 @${number} est maintenant AFK.

💬 Raison : ${reason}

『By nicolas』 🍫🎻`,
    {
      mentions: [sender]
    }
  );
}

async function handleAfkList(
  sock,
  jid
) {

  const entries =
    Object.entries(
      state.afk
    );

  if (!entries.length) {

    return sendText(
      sock,
      jid,
      "😴 Aucun utilisateur AFK."
    );
  }

  const text =
    entries
      .map(
        ([number, data], index) =>
          `${index + 1}. @${number}\n` +
          `   💬 ${data.reason}\n` +
          `   ⏱️ ${formatDuration(Date.now() - data.since)}`
      )
      .join("\n\n");

  await sendText(
    sock,
    jid,
`╭━━━〔 😴 AFK LIST 〕━━━╮

${text}

『By nicolas』 🍫🎻`,
    {
      mentions:
        entries.map(
          ([number]) =>
            `${number}@s.whatsapp.net`
        )
    }
  );
}

async function handleAfkAutoRemove(
  sock,
  jid,
  sender
) {

  const number =
    normalizeNumber(
      jidToNumber(sender)
    );

  if (!state.afk[number]) {
    return false;
  }

  const data =
    state.afk[number];

  delete state.afk[number];

  saveAfk();

  await sendText(
    sock,
    jid,
`👋 @${number} n'est plus AFK.

⏱️ AFK pendant :
${formatDuration(
  Date.now() - data.since
)}

『By nicolas』 🍫🎻`,
    {
      mentions: [sender]
    }
  );

  return true;
}

/* ═══════════════════════════════════════
   FANCY
═══════════════════════════════════════ */

async function handleFancy(
  sock,
  jid,
  args
) {

  if (!args.length) {

    return sendText(
      sock,
      jid,
`✨ FANCY

.fancy Nicolas
.fancy 1 Nicolas
.fancy 2 Nicolas
.fancy 3 Nicolas
.fancy 4 Nicolas
.fancy 5 Nicolas

Styles disponibles : ${FANCY.length}`
    );
  }

  let style =
    parseInt(
      args[0]
    );

  let text;

  if (Number.isNaN(style)) {

    style = 0;

    text =
      args.join(" ");

  } else {

    style =
      Math.max(
        0,
        style - 1
      );

    text =
      args.slice(1).join(" ");
  }

  if (!text) {
    text = "Nicolas";
  }

  await sendText(
    sock,
    jid,
`✨ FANCY STYLE ${style + 1}

${fancy(
  text,
  style
)}

『By nicolas』 🍫🎻`
  );
}

/* ═══════════════════════════════════════
   PURGE
═══════════════════════════════════════ */

async function handlePurge(
  sock,
  jid
) {

  await sendText(
    sock,
    jid,
    purgeText()
  );
}

/* ═══════════════════════════════════════
   GROUP INFO
═══════════════════════════════════════ */

async function handleGroupInfo(
  sock,
  jid
) {

  if (!isGroupJid(jid)) {

    return sendText(
      sock,
      jid,
      "❌ Groupe uniquement."
    );
  }

  const metadata =
    await sock.groupMetadata(
      jid
    );

  const admins =
    metadata.participants
      .filter(
        p =>
          p.admin === "admin" ||
          p.admin === "superadmin"
      )
      .length;

  await sendText(
    sock,
    jid,
`╭━━━〔 👥 GROUP INFO 〕━━━╮

🏷️ Nom :
${metadata.subject}

👤 Membres :
${metadata.participants.length}

👑 Admins :
${admins}

🆔 ID :
${jid}

『By nicolas』 🍫🎻`
  );
}

/* ═══════════════════════════════════════
   TAG ALL
═══════════════════════════════════════ */

async function handleTagAll(
  sock,
  jid,
  sender,
  args
) {

  if (!(await requireGroup(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  if (!(await requireAdmin(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  const metadata =
    await sock.groupMetadata(
      jid
    );

  const participants =
    metadata.participants;

  const mentions =
    participants.map(
      p => p.id
    );

  const text =
    args.join(" ") ||
    "📢 Attention tout le monde !";

  const body =
`${text}

${participants
  .map(
    p =>
      `@${cleanMention(p.id)}`
  )
  .join(" ")}

『By nicolas』 🍫🎻`;

  await sendText(
    sock,
    jid,
    body,
    {
      mentions
    }
  );
}

/* ═══════════════════════════════════════
   GROUP LINK
═══════════════════════════════════════ */

async function handleGroupLink(
  sock,
  jid
) {

  if (!isGroupJid(jid)) {
    return;
  }

  try {

    const code =
      await sock.groupInviteCode(
        jid
      );

    await sendText(
      sock,
      jid,
`🔗 INVITATION DU GROUPE

https://chat.whatsapp.com/${code}

『By nicolas』 🍫🎻`
    );

  } catch {

    await sendText(
      sock,
      jid,
      "❌ Impossible de récupérer le lien."
    );
  }
}

/* ═══════════════════════════════════════
   REVOKE
═══════════════════════════════════════ */

async function handleRevoke(
  sock,
  jid,
  sender
) {

  if (!(await requireGroup(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  if (!(await requireAdmin(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  try {

    await sock.groupRevokeInvite(
      jid
    );

    await sendText(
      sock,
      jid,
      "🔒 Le lien du groupe a été réinitialisé."
    );

  } catch {

    await sendText(
      sock,
      jid,
      "❌ Impossible de réinitialiser le lien."
    );
  }
}

/* ═══════════════════════════════════════
   DELETE MESSAGE
═══════════════════════════════════════ */

async function handleDelete(
  sock,
  jid,
  message,
  sender
) {

  if (!isGroupJid(jid)) {

    return sendText(
      sock,
      jid,
      "❌ Cette commande est prévue pour les groupes."
    );
  }

  if (!(await requireAdmin(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  const context =
    getContext(message);

  const stanzaId =
    context?.stanzaId;

  const participant =
    context?.participant;

  if (!stanzaId) {

    return sendText(
      sock,
      jid,
      "❌ Réponds au message que tu veux supprimer."
    );
  }

  try {

    await sock.sendMessage(
      jid,
      {
        delete: {
          remoteJid: jid,
          fromMe:
            participant ===
            sock.user?.id,
          id: stanzaId,
          participant
        }
      }
    );

  } catch {

    await sendText(
      sock,
      jid,
      "❌ Impossible de supprimer ce message."
    );
  }
}

/* ═══════════════════════════════════════
   GET PP
═══════════════════════════════════════ */

async function handleGetPP(
  sock,
  jid,
  message,
  args
) {

  let target = null;

  if (
    args[0] === "group" &&
    isGroupJid(jid)
  ) {

    target = jid;

  } else {

    target =
      getTargetJid(
        message,
        args
      ) ||
      getSenderJid(
        message
      );
  }

  if (!target) {

    return sendText(
      sock,
      jid,
      "❌ Impossible de trouver la photo de profil."
    );
  }

  try {

    const url =
      await sock.profilePictureUrl(
        target,
        "image"
      );

    await sendImage(
      sock,
      jid,
      url,
`🖼️ Photo de profil

『By nicolas』 🍫🎻`
    );

  } catch {

    await sendText(
      sock,
      jid,
      "❌ Cette personne n'a pas de photo de profil accessible."
    );
  }
}

/* ═══════════════════════════════════════
   KIKI / VIEW ONCE
═══════════════════════════════════════ */

async function handleKiki(
  sock,
  jid,
  message
) {

  const quoted =
    getQuoted(message);

  if (!quoted) {

    return sendText(
      sock,
      jid,
      "❌ Réponds à une photo ou vidéo View Once."
    );
  }

  const fakeMessage = {
    message: quoted
  };

  const media =
    extractMedia(
      fakeMessage
    );

  if (!media) {

    return sendText(
      sock,
      jid,
      "❌ Aucun média récupérable."
    );
  }

  try {

    const buffer =
      await downloadMedia(
        media
      );

    if (
      media.type ===
      "imageMessage"
    ) {

      await sock.sendMessage(
        jid,
        {
          image: buffer,
          caption:
`👀 View Once récupéré.

『By nicolas』 🍫🎻`
        }
      );

      return;
    }

    if (
      media.type ===
      "videoMessage"
    ) {

      await sock.sendMessage(
        jid,
        {
          video: buffer,
          caption:
`👀 View Once récupéré.

『By nicolas』 🍫🎻`
        }
      );

      return;
    }

    await sock.sendMessage(
      jid,
      {
        document: buffer,
        mimetype:
          media.message?.mimetype ||
          "application/octet-stream",
        fileName:
          "nicolas-media"
      }
    );

  } catch (error) {

    console.error(
      "KIKI ERROR:",
      error.message
    );

    await sendText(
      sock,
      jid,
      "❌ Impossible de récupérer ce View Once."
    );
  }
}

/* ═══════════════════════════════════════
   TAKE
═══════════════════════════════════════ */

const DEFAULT_PACK =
"︵𞋮⏜͡︵🍓 ֺׅຶsαgᧉִ͞͞͞ ղіᥴׄ᥆ֹׅlαs ⵿ׄ͡ এ╰︶࣪࣪࣪࣪࣪⏝᮫̯࣭〫࣫⌣⃘ᰰ";

async function handleTake(
  sock,
  jid,
  message,
  args
) {

  const quoted =
    getQuoted(message);

  if (!quoted) {

    return sendText(
      sock,
      jid,
      "❌ Réponds à un sticker."
    );
  }

  const fakeMessage = {
    message: quoted
  };

  const media =
    extractMedia(
      fakeMessage
    );

  if (
    !media ||
    media.type !==
      "stickerMessage"
  ) {

    return sendText(
      sock,
      jid,
      "❌ Le message répondu doit être un sticker."
    );
  }

  try {

    const buffer =
      await downloadMedia(
        media
      );

    const input =
      args.join(" ").trim();

    let pack =
      DEFAULT_PACK;

    let author =
      OWNER_NAME;

    if (input.includes(";")) {

      const parts =
        input.split(";");

      pack =
        parts[0].trim() ||
        DEFAULT_PACK;

      author =
        parts[1]?.trim() ||
        OWNER_NAME;

    } else if (input) {

      pack = input;
    }

    await sock.sendMessage(
      jid,
      {
        sticker: buffer
      }
    );

    await sendText(
      sock,
      jid,
`🏷️ TAKE

📦 Pack :
${pack}

✍️ Auteur :
${author}

⚠️ Le sticker original a été renvoyé.
La modification EXIF complète sera ajoutée avec le module EXIF.

『By nicolas』 🍫🎻`
    );

  } catch (error) {

    console.error(
      "TAKE ERROR:",
      error.message
    );

    await sendText(
      sock,
      jid,
      "❌ Impossible de récupérer le sticker."
    );
  }
}

/* ═══════════════════════════════════════
   KIKI ALIAS
═══════════════════════════════════════ */

async function handleKikiAlias(
  sock,
  jid,
  message
) {

  return handleKiki(
    sock,
    jid,
    message
  );
}

/* ═══════════════════════════════════════
   GROUP ACTION
═══════════════════════════════════════ */

async function groupAction(
  sock,
  jid,
  sender,
  message,
  args,
  action
) {

  if (!(await requireGroup(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  if (!(await requireAdmin(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  const target =
    getTargetJid(
      message,
      args
    );

  if (!target) {

    return sendText(
      sock,
      jid,
      `❌ Mentionne ou réponds à la personne.

Exemple :
${PREFIX}${action} @user`
    );
  }

  if (isOwner(target)) {

    return sendText(
      sock,
      jid,
      "❌ Nicolas ne peut pas être ciblé."
    );
  }

  try {

    if (action === "add") {

      await sock.groupParticipantsUpdate(
        jid,
        [target],
        "add"
      );

    } else if (
      action === "ban" ||
      action === "kick"
    ) {

      await sock.groupParticipantsUpdate(
        jid,
        [target],
        "remove"
      );

    } else if (
      action === "promote"
    ) {

      await sock.groupParticipantsUpdate(
        jid,
        [target],
        "promote"
      );

    } else if (
      action === "demote"
    ) {

      await sock.groupParticipantsUpdate(
        jid,
        [target],
        "demote"
      );
    }

    await sendMention(
      sock,
      jid,
      `✅ Action ${action} effectuée sur @${cleanMention(target)}.`,
      [target]
    );

  } catch (error) {

    console.error(
      `GROUP ${action} ERROR:`,
      error.message
    );

    await sendText(
      sock,
      jid,
      `❌ Impossible d'effectuer ${action}.`
    );
  }
}

/* ═══════════════════════════════════════
   ANTILINK
═══════════════════════════════════════ */

async function handleAntilink(
  sock,
  jid,
  sender,
  args
) {

  if (!(await requireGroup(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  if (!(await requireAdmin(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  const config =
    getProtection(jid);

  const action =
    (
      args[0] ||
      ""
    ).toLowerCase();

  if (action === "on") {

    config.antilink = true;

    saveProtections();

    return sendText(
      sock,
      jid,
      "🛡️ Antilink activé."
    );
  }

  if (action === "off") {

    config.antilink = false;

    saveProtections();

    return sendText(
      sock,
      jid,
      "🔓 Antilink désactivé."
    );
  }

  if (
    action === "kick" ||
    action === "delete"
  ) {

    config.antilinkAction =
      action;

    saveProtections();

    return sendText(
      sock,
      jid,
      `🛡️ Action Antilink : ${action}`
    );
  }

  return sendText(
    sock,
    jid,
`🛡️ ANTILINK

Status :
${config.antilink ? "ON" : "OFF"}

Action :
${config.antilinkAction}

Commandes :

.antilink on
.antilink off
.antilink kick
.antilink delete`
  );
}

/* ═══════════════════════════════════════
   ANTIPROMOTE
═══════════════════════════════════════ */

async function handleAntiPromote(
  sock,
  jid,
  sender,
  args
) {

  if (!(await requireGroup(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  if (!(await requireAdmin(
    sock,
    jid,
    sender
  ))) {
    return;
  }

  const config =
    getProtection(jid);

  const action =
    (
      args[0] ||
      ""
    ).toLowerCase();

  if (action === "on") {

    config.antipromote =
      true;

    saveProtections();

    return sendText(
      sock,
      jid,
      "🛡️ Antipromote activé."
    );
  }

  if (action === "off") {

    config.antipromote =
      false;

    saveProtections();

    return sendText(
      sock,
      jid,
      "🔓 Antipromote désactivé."
    );
  }

  return sendText(
    sock,
    jid,
`🛡️ ANTIPROMOTE

Status :
${config.antipromote ? "ON" : "OFF"}

.antipromote on
.antipromote off
.antipromote status`
  );
}

/* ═══════════════════════════════════════
   PAIR
═══════════════════════════════════════ */

async function handlePair(
  sock,
  jid,
  sender,
  args
) {

  if (!isOwner(sender)) {

    return sendText(
      sock,
      jid,
      "❌ Seul Nicolas peut utiliser .pair."
    );
  }

  if (!args[0]) {

    return sendText(
      sock,
      jid,
      "❌ Exemple : .pair 242067904938"
    );
  }

  const number =
    normalizeNumber(
      args[0]
    );

  if (number.length < 8) {

    return sendText(
      sock,
      jid,
      "❌ Numéro invalide."
    );
  }

  if (pairingRequested) {

    return sendText(
      sock,
      jid,
      "⏳ Une demande de pairing est déjà en cours."
    );
  }

  try {

    pairingRequested =
      true;

    const code =
      await sock.requestPairingCode(
        number
      );

    await sendText(
      sock,
      jid,
`╭━━━〔 🔐 PAIRING 〕━━━╮

📱 Numéro :
+${number}

🔑 Code :
${code}

⚠️ Entre ce code dans WhatsApp
pour connecter le bot.

『By nicolas』 🍫🎻`
    );

    clearTimeout(
      pairingTimeout
    );

    pairingTimeout =
      setTimeout(
        () => {
          pairingRequested =
            false;
        },
        60000
      );

  } catch (error) {

    pairingRequested =
      false;

    console.error(
      "PAIR ERROR:",
      error.message
    );

    await sendText(
      sock,
      jid,
`❌ Impossible de générer le code.

${error.message}`
    );
  }
}

/* ═══════════════════════════════════════
   MESSAGE NORMAL / PROTECTION
═══════════════════════════════════════ */

async function handleAntiLinkMessage(
  sock,
  jid,
  message,
  sender,
  text
) {

  if (!isGroupJid(jid)) {
    return false;
  }

  const config =
    getProtection(jid);

  if (!config.antilink) {
    return false;
  }

  if (hasOwnerAccess(sender)) {
    return false;
  }

  if (
    await isAdmin(
      sock,
      jid,
      sender
    )
  ) {
    return false;
  }

  const linkRegex =
    /(https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|instagram\.com\/|youtube\.com\/|youtu\.be\/)/i;

  if (!linkRegex.test(text)) {
    return false;
  }

  try {

    if (
      config.antilinkAction ===
      "delete"
    ) {

      await sock.sendMessage(
        jid,
        {
          delete:
            message.key
        }
      );

    } else if (
      config.antilinkAction ===
      "kick"
    ) {

      await sock.sendMessage(
        jid,
        {
          delete:
            message.key
        }
      );

      await sock.groupParticipantsUpdate(
        jid,
        [sender],
        "remove"
      );
    }

    await sendMention(
      sock,
      jid,
      `🛡️ Antilink : @${cleanMention(sender)} a envoyé un lien.`,
      [sender]
    );

  } catch {}

  return true;
}

/* ═══════════════════════════════════════
   COMMAND HANDLER
═══════════════════════════════════════ */

async function handleCommand(
  sock,
  jid,
  message,
  sender,
  parsed
) {

  const {
    command,
    args
  } = parsed;

  switch (command) {

    case "alive":
      return handleAlive(
        sock,
        jid
      );

    case "ping":
      return handlePing(
        sock,
        jid
      );

    case "speed":
      return handleSpeed(
        sock,
        jid
      );

    case "owner":
      return handleOwner(
        sock,
        jid
      );

    case "repo":
      return handleRepo(
        sock,
        jid
      );

    case "menu":

      return sendImage(
        sock,
        jid,
        getCurrentTheme().menu,
        menuText()
      );

    case "sudo":
      return handleSudo(
        sock,
        jid,
        sender,
        args,
        message
      );

    case "pair":
      return handlePair(
        sock,
        jid,
        sender,
        args
      );

    case "purge":
      return handlePurge(
        sock,
        jid
      );

    case "theme":
      return handleTheme(
        sock,
        jid,
        sender,
        args
      );

    case "afk":

      if (
        args[0]?.toLowerCase() ===
        "list"
      ) {

        return handleAfkList(
          sock,
          jid
        );
      }

      return handleAfk(
        sock,
        jid,
        sender,
        args
      );

    case "fancy":
      return handleFancy(
        sock,
        jid,
        args
      );

    case "kiki":
    case "vv":
      return handleKikiAlias(
        sock,
        jid,
        message
      );

    case "take":
      return handleTake(
        sock,
        jid,
        message,
        args
      );

    case "getpp":
      return handleGetPP(
        sock,
        jid,
        message,
        args
      );

    case "delete":
    case "del":
      return handleDelete(
        sock,
        jid,
        message,
        sender
      );

    case "add":
    case "ban":
    case "kick":
    case "promote":
    case "demote":

      return groupAction(
        sock,
        jid,
        sender,
        message,
        args,
        command
      );

    case "groupinfo":
      return handleGroupInfo(
        sock,
        jid
      );

    case "tagall":
    case "tag":
      return handleTagAll(
        sock,
        jid,
        sender,
        args
      );

    case "link":
      return handleGroupLink(
        sock,
        jid
      );

    case "revoke":
      return handleRevoke(
        sock,
        jid,
        sender
      );

    case "left":

      if (!(await requireGroup(
        sock,
        jid,
        sender
      ))) {
        return;
      }

      if (!(await requireAdmin(
        sock,
        jid,
        sender
      ))) {
        return;
      }

      await sendText(
        sock,
        jid,
        "👋 Nicolas quitte le groupe..."
      );

      return sock.groupLeave(
        jid
      );

    case "antilink":
      return handleAntilink(
        sock,
        jid,
        sender,
        args
      );

    case "antipromote":
      return handleAntiPromote(
        sock,
        jid,
        sender,
        args
      );

    case "8ball": {

      const answers = [
        "Oui.",
        "Non.",
        "Peut-être.",
        "Absolument.",
        "Impossible.",
        "Demande à Nicolas. 😂",
        "Le destin décidera.",
        "Je ne peux pas répondre."
      ];

      return sendText(
        sock,
        jid,
        `🎱 ${randomItem(answers)}`
      );
    }

    case "coinflip":

      return sendText(
        sock,
        jid,
        `🪙 ${Math.random() > 0.5 ? "PILE" : "FACE"}`
      );

    case "roll": {

      const max =
        parseInt(args[0]) || 6;

      const result =
        Math.floor(
          Math.random() * max
        ) + 1;

      return sendText(
        sock,
        jid,
        `🎲 Résultat : ${result}`
      );
    }

    case "joke":
    case "blague": {

      const jokes = [
        "Pourquoi les développeurs aiment-ils le café ? Parce que sans lui, ils deviennent des bugs. 😂",
        "Mon code fonctionne... ne me demande surtout pas pourquoi. 💀",
        "Nicolas a dit que ça marche. Donc ça marche. 😭"
      ];

      return sendText(
        sock,
        jid,
        `😂 ${randomItem(jokes)}`
      );
    }

    case "compliment": {

      const compliments = [
        "🔥 T'es vraiment lourd.",
        "👑 T'as une présence de boss.",
        "✨ Franchement, t'es incroyable.",
        "😎 Le charisme est présent."
      ];

      return sendText(
        sock,
        jid,
        randomItem(compliments)
      );
    }

    case "flirt":

      return sendText(
        sock,
        jid,
        "😏 Si le charme était une commande, je crois que tu viens de l'exécuter."
      );

    case "love":

      return sendText(
        sock,
        jid,
        "❤️ L'amour c'est compliqué... mais les bugs le sont encore plus. 😂"
      );

    case "hug":

      return sendText(
        sock,
        jid,
        "🫂 Gros câlin !"
      );

    case "kiss":

      return sendText(
        sock,
        jid,
        "😘 Bisou envoyé."
      );

    case "slap":

      return sendText(
        sock,
        jid,
        "👋 *PAF* Réveille-toi frérot 😂"
      );

    case "fact": {

      const facts = [
        "🧠 Le cerveau humain contient environ 86 milliards de neurones.",
        "🌍 La Terre n'est pas parfaitement ronde.",
        "🐙 Les poulpes ont trois cœurs.",
        "⚡ La foudre peut atteindre des températures extrêmement élevées."
      ];

      return sendText(
        sock,
        jid,
        randomItem(facts)
      );
    }

    case "truth":

      return sendText(
        sock,
        jid,
        "🎯 Vérité : quelle est la dernière personne à qui tu as pensé aujourd'hui ?"
      );

    case "dare":

      return sendText(
        sock,
        jid,
        "🔥 Défi : envoie un message à quelqu'un avec seulement trois emojis."
      );

    case "rps": {

      const choices = [
        "pierre",
        "papier",
        "ciseaux"
      ];

      const bot =
        randomItem(choices);

      return sendText(
        sock,
        jid,
        `✊📄✂️

Toi : ${args[0] || "?"}
Moi : ${bot}`
      );
    }

    case "math": {

      const expression =
        args.join(" ");

      if (
        !/^[0-9+\-*/().\s]+$/
          .test(expression)
      ) {

        return sendText(
          sock,
          jid,
          "❌ Expression mathématique invalide."
        );
      }

      try {

        const result =
          Function(
            `"use strict"; return (${expression})`
          )();

        return sendText(
          sock,
          jid,
          `🧮 ${expression} = ${result}`
        );

      } catch {

        return sendText(
          sock,
          jid,
          "❌ Impossible de calculer."
        );
      }
    }

    default:

      return sendText(
        sock,
        jid,
`❌ Commande inconnue :

.${command}

Tape ${PREFIX}menu pour voir les commandes.`
      );
  }
}

/* ═══════════════════════════════════════
   MESSAGE HANDLER
═══════════════════════════════════════ */

async function handleMessage(
  sock,
  message
) {

  try {

    if (!message?.message) {
      return;
    }

    const jid =
      message.key.remoteJid;

    if (!jid) {
      return;
    }

    const sender =
      getSenderJid(message);

    const text =
      getText(message).trim();

    if (
      text &&
      !text.startsWith(PREFIX)
    ) {

      await handleAfkAutoRemove(
        sock,
        jid,
        sender
      );
    }

    if (
      text &&
      await handleAntiLinkMessage(
        sock,
        jid,
        message,
        sender,
        text
      )
    ) {
      return;
    }

    const mentions =
      getMentioned(message);

    if (mentions.length) {

      for (
        const mentioned of mentions
      ) {

        const number =
          normalizeNumber(
            jidToNumber(mentioned)
          );

        const afk =
          state.afk[number];

        if (!afk) {
          continue;
        }

        afk.mentions =
          (afk.mentions || 0) + 1;

        saveAfk();

        await sendMention(
          sock,
          jid,
`😴 @${number} est AFK.

💬 Raison :
${afk.reason}

⏱️ Depuis :
${formatDuration(
  Date.now() - afk.since
)}

📢 Mentions :
${afk.mentions}

『By nicolas』 🍫🎻`,
          [mentioned]
        );
      }
    }

    const parsed =
      parseCommand(text);

    if (!parsed) {
      return;
    }

    await handleCommand(
      sock,
      jid,
      message,
      sender,
      parsed
    );

  } catch (error) {

    console.error(
      "MESSAGE ERROR:",
      error
    );
  }
}

/* ═══════════════════════════════════════
   WELCOME / GOODBYE
═══════════════════════════════════════ */

async function handleGroupParticipants(
  sock,
  update
) {

  try {

    const {
      id,
      participants,
      action
    } = update;

    if (
      !id ||
      !participants?.length
    ) {
      return;
    }

    const config =
      getProtection(id);

    if (
      action === "promote" &&
      config.antipromote &&
      await isBotAdmin(
        sock,
        id
      )
    ) {

      for (
        const participant of participants
      ) {

        if (isOwner(participant)) {
          continue;
        }

        try {

          await sock.groupParticipantsUpdate(
            id,
            [participant],
            "demote"
          );

          await sendMention(
            sock,
            id,
`🛡️ ANTIPROMOTE

@${cleanMention(participant)}
a été automatiquement rétrogradé.

『By nicolas』 🍫🎻`,
            [participant]
          );

        } catch {}
      }

      return;
    }

    if (action === "add") {

      const mentions =
        participants;

      const names =
        participants
          .map(
            p =>
              `@${cleanMention(p)}`
          )
          .join(", ");

      await sock.sendMessage(
        id,
        {
          image: {
            url:
              getCurrentTheme().welcome
          },
          caption:
`╭━━━〔 👋 WELCOME 〕━━━╮

Bienvenue ${names} !

🔥 Bienvenue dans le groupe.
🤖 ${BOT_NAME}
🎨 Theme : ${state.theme.toUpperCase()}

『By nicolas』 🍫🎻`,
          mentions
        }
      );
    }

    if (action === "remove") {

      const mentions =
        participants;

      const names =
        participants
          .map(
            p =>
              `@${cleanMention(p)}`
          )
          .join(", ");

      await sock.sendMessage(
        id,
        {
          image: {
            url:
              getCurrentTheme().goodbye
          },
          caption:
`╭━━━〔 👋 GOODBYE 〕━━━╮

${names} nous quitte.

👋 Bonne continuation !

『By nicolas』 🍫🎻`,
          mentions
        }
      );
    }

  } catch (error) {

    console.error(
      "GROUP PARTICIPANTS ERROR:",
      error.message
    );
  }
}

/* ═══════════════════════════════════════
   CONNECTION
═══════════════════════════════════════ */

async function startBot() {

  if (starting) {
    return;
  }

  starting = true;

  try {

    const {
      state: authState,
      saveCreds
    } =
      await useMultiFileAuthState(
        AUTH_DIR
      );

    const {
      version
    } =
      await fetchLatestBaileysVersion();

    sock =
      makeWASocket({

        version,

        auth:
          authState,

        logger:
          pino({
            level: "silent"
          }),

        printQRInTerminal:
          false,

        browser: [
          "NICOLAS ULTRA XMD",
          "Chrome",
          VERSION
        ],

        generateHighQualityLinkPreview:
          true
      });

    sock.ev.on(
      "creds.update",
      saveCreds
    );

    sock.ev.on(
      "connection.update",
      async update => {

        const {
          connection,
          lastDisconnect
        } = update;

        if (
          connection === "open"
        ) {

          starting = false;

          pairingRequested =
            false;

          console.log(
            `✅ ${BOT_NAME} V${VERSION} CONNECTÉ`
          );

          return;
        }

        if (
          connection === "close"
        ) {

          starting = false;

          const statusCode =
            lastDisconnect
              ?.error
              ?.output
              ?.statusCode;

          const shouldReconnect =
            statusCode !==
            DisconnectReason.loggedOut;

          console.log(
            "❌ Connexion fermée :",
            statusCode
          );

          if (shouldReconnect) {

            clearTimeout(
              reconnectTimer
            );

            reconnectTimer =
              setTimeout(
                () => {
                  startBot();
                },
                5000
              );

          } else {

            console.log(
              "⚠️ Session déconnectée. Supprime auth_info_baileys puis reconnecte."
            );
          }
        }
      }
    );

    sock.ev.on(
      "messages.upsert",
      async ({
        messages
      }) => {

        for (
          const message of messages
        ) {

          if (
            message.key.fromMe
          ) {
            continue;
          }

          await handleMessage(
            sock,
            message
          );
        }
      }
    );

    sock.ev.on(
      "group-participants.update",
      async update => {

        await handleGroupParticipants(
          sock,
          update
        );
      }
    );

  } catch (error) {

    starting = false;

    console.error(
      "START ERROR:",
      error
    );

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer =
      setTimeout(
        () => {
          startBot();
        },
        5000
      );
  }
}

/* ═══════════════════════════════════════
   ERREURS GLOBALES
═══════════════════════════════════════ */

process.on(
  "uncaughtException",
  error => {

    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "UNHANDLED REJECTION:",
      error
    );
  }
);

/* ═══════════════════════════════════════
   START
═══════════════════════════════════════ */

console.log(`
╔══════════════════════════════════════╗
║      NICOLAS ULTRA XMD V3            ║
║                                      ║
║      Version : ${VERSION}             ║
║      Prefix  : ${PREFIX}              ║
║      Owner   : ${OWNER_NAME}          ║
╚══════════════════════════════════════╝
`);

startBot();
