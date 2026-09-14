// ============================================================
// NICOLAS ULTRA XMD
// Version 3.0.0
// Single-file WhatsApp Bot
// ============================================================

require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  Browsers,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");

// ===============================
// CONFIG
// ===============================

const BOT_NAME = "NICOLAS ULTRA XMD";
const VERSION = "3.0.0";
const PREFIX = ".";

const AUTH_DIR =
  process.env.AUTH_DIR ||
  "/app/auth_info_baileys";

const OWNER_NAME = "Nicolas";

function normalizeNumber(number = "") {
  return String(number)
    .replace(/\D/g, "")
    .replace(/^00/, "");
}

const OWNER_NUMBER = normalizeNumber(
  process.env.OWNER_NUMBER ||
  process.env.PAIRING_NUMBER ||
  ""
);

const OWNER_JID = OWNER_NUMBER
  ? `${OWNER_NUMBER}@s.whatsapp.net`
  : "";

const OWNER_TELEGRAM = "@Sage_ou_Nicolas";

const OFFICIAL_IMAGES = {
  menu: "https://k.top4top.io/p_3908er0dq1.jpg",

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

const MENU_MUSIC = path.join(
  process.cwd(),
  "assets",
  "menu.m4a"
);

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

// ===============================
// DATA
// ===============================

const DATA_DIR = path.join(
  process.cwd(),
  "data"
);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {
    recursive: true
  });
}

const files = {
  theme: path.join(
    DATA_DIR,
    "theme.json"
  ),

  sudo: path.join(
    DATA_DIR,
    "sudo.json"
  ),

  afk: path.join(
    DATA_DIR,
    "afk.json"
  ),

  protections: path.join(
    DATA_DIR,
    "protections.json"
  )
};

function ensureJSON(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(
        fallback,
        null,
        2
      )
    );
  }
}

ensureJSON(files.theme, {
  global: "solo",
  groups: {}
});

ensureJSON(files.sudo, []);

ensureJSON(files.afk, {});

ensureJSON(
  files.protections,
  {}
);

function readJSON(file, fallback) {
  try {
    return JSON.parse(
      fs.readFileSync(
        file,
        "utf8"
      )
    );
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

// ===============================
// STATE
// ===============================

let sock = null;
let reconnectTimer = null;
let starting = false;

let pairingRequested = false;
let pairingInProgress = false;
let pairingSession = false;

let botGeneration = 0;

// ===============================
// HELPERS
// ===============================

const sleep = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  );

function randomItem(array) {
  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];
}

function jidToNumber(jid = "") {
  return jid
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function isGroupJid(jid = "") {
  return jid.endsWith("@g.us");
}

function getSenderJid(message) {
  return (
    message?.key?.participant ||
    message?.participant ||
    message?.key?.remoteJid ||
    ""
  );
}

function isOwner(jid) {
  if (!OWNER_NUMBER) {
    return false;
  }

  return (
    normalizeNumber(
      jidToNumber(jid)
    ) === OWNER_NUMBER
  );
}

function getSudo() {
  return readJSON(
    files.sudo,
    []
  );
}

function isSudo(jid) {
  const number =
    normalizeNumber(
      jidToNumber(jid)
    );

  return getSudo().some(
    x =>
      normalizeNumber(x) ===
      number
  );
}

function hasOwnerAccess(jid) {
  return (
    isOwner(jid) ||
    isSudo(jid)
  );
}

function getText(message) {
  const m =
    message?.message;

  if (!m) {
    return "";
  }

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ""
  );
}

async function react(
  jid,
  key,
  emoji
) {
  try {
    await sock.sendMessage(
      jid,
      {
        react: {
          text: emoji,
          key
        }
      }
    );
  } catch {}
}

async function sendText(
  jid,
  text,
  options = {}
) {
  return sock.sendMessage(
    jid,
    {
      text
    },
    options
  );
}

async function sendImage(
  jid,
  image,
  caption = "",
  options = {}
) {
  return sock.sendMessage(
    jid,
    {
      image: {
        url: image
      },
      caption
    },
    options
  );
}

function getCurrentTheme(
  jid = ""
) {
  const themes =
    readJSON(
      files.theme,
      {
        global: "solo",
        groups: {}
      }
    );

  const name =
    isGroupJid(jid) &&
    themes.groups[jid]
      ? themes.groups[jid]
      : themes.global;

  return {
    name,

    menu:
      OFFICIAL_IMAGES.menu,

    alive:
      OFFICIAL_IMAGES.alive,

    ping:
      OFFICIAL_IMAGES.ping,

    welcome:
      OFFICIAL_IMAGES.welcome,

    goodbye:
      OFFICIAL_IMAGES.goodbye
  };
}

function setTheme(
  jid,
  theme
) {
  if (
    !THEMES.includes(theme)
  ) {
    return false;
  }

  const themes =
    readJSON(
      files.theme,
      {
        global: "solo",
        groups: {}
      }
    );

  if (isGroupJid(jid)) {
    themes.groups[jid] =
      theme;
  } else {
    themes.global =
      theme;
  }

  writeJSON(
    files.theme,
    themes
  );

  return true;
}

// ===============================
// GROUP
// ===============================

async function getGroupMetadata(
  jid
) {
  return sock.groupMetadata(
    jid
  );
}

function getGroupAdmins(
  metadata
) {
  return metadata.participants
    .filter(p => p.admin)
    .map(p => p.id);
}

function isAdmin(
  metadata,
  jid
) {
  const number =
    normalizeNumber(
      jidToNumber(jid)
    );

  return metadata.participants.some(
    p =>
      normalizeNumber(
        jidToNumber(p.id)
      ) === number &&
      !!p.admin
  );
}

function isBotAdmin(
  metadata
) {
  if (!sock?.user?.id) {
    return false;
  }

  const botNumber =
    normalizeNumber(
      jidToNumber(
        sock.user.id
      )
    );

  return metadata.participants.some(
    p =>
      normalizeNumber(
        jidToNumber(p.id)
      ) === botNumber &&
      !!p.admin
  );
}

function getTargetJid(
  message
) {
  const context =
    message?.message
      ?.extendedTextMessage
      ?.contextInfo;

  const mentioned =
    context?.mentionedJid ||
    [];

  if (
    mentioned.length
  ) {
    return mentioned[0];
  }

  if (
    context?.participant
  ) {
    return context.participant;
  }

  return null;
}

// ===============================
// FANCY
// ===============================

const FANCY_STYLES = [
  text =>
    `𝑵𝑰𝑪𝑶𝑳𝑨𝑺 𝑼𝑳𝑻𝑹𝑨 𝑿𝑴𝑫`,

  text =>
    `𝓝𝓘𝓒𝓞𝓛𝓐𝓢 𝓤𝓛𝓣𝓡𝓐 𝓧𝓜𝓓`,

  text =>
    `𝗡𝗜𝗖𝗢𝗟𝗔𝗦 𝗨𝗟𝗧𝗥𝗔 𝗫𝗠𝗗`,

  text =>
    `𝙉𝙄𝘾𝙊𝙇𝘼𝙎 𝙐𝙇𝙏𝙍𝘼 𝙓𝙈𝘿`,

  text =>
    `ＮＩＣＯＬＡＳ ＵＬＴＲＡ ＸＭＤ`,

  text =>
    `Nɪᴄᴏʟᴀs Uʟᴛʀᴀ XMD`
];

function fancy(
  text,
  style = 0
) {
  const fn =
    FANCY_STYLES[
      style %
      FANCY_STYLES.length
    ];

  return fn(text);
}

// ===============================
// MENU
// ===============================

const COMMANDS = [
  ["alive", "Voir si le bot est en ligne"],
  ["ping", "Tester la vitesse"],
  ["speed", "Voir la vitesse du bot"],
  ["owner", "Informations du propriétaire"],
  ["repo", "Dépôt du projet"],
  ["menu", "Afficher le menu"],

  ["sudo", "Gérer les sudo"],
  ["pair", "Connexion par pairing"],
  ["purge", "Nettoyer les messages"],

  ["add", "Ajouter un membre"],
  ["ban", "Bannir un membre"],
  ["kick", "Expulser un membre"],
  ["promote", "Promouvoir admin"],
  ["demote", "Retirer admin"],
  ["tag", "Mentionner un membre"],
  ["tagall", "Mentionner tout le groupe"],
  ["groupinfo", "Informations du groupe"],
  ["listadmin", "Liste des admins"],
  ["staff", "Voir le staff"],
  ["link", "Lien du groupe"],
  ["revoke", "Réinitialiser le lien"],
  ["groupname", "Changer le nom"],
  ["setgdesc", "Changer la description"],
  ["left", "Quitter le groupe"],

  ["antilink", "Protection anti-lien"],
  ["antipromote", "Protection anti-promotion"],

  ["afk", "Mode absence"],
  ["fancy", "Écriture stylée"],

  ["pinterest", "Recherche Pinterest"],
  ["pin", "Recherche Pinterest"],
  ["couple", "Couple aléatoire"],
  ["couplepp", "PFP couple anime"],
  ["play", "Télécharger une musique"],
  ["song", "Télécharger une musique"],

  ["kiki", "Voir un média"],
  ["take", "Sticker personnalisé"],
  ["tourl", "Uploader un média"],
  ["ssweb", "Capture d'un site"],
  ["getpp", "Photo de profil"],
  ["delete", "Supprimer un message"],

  ["theme", "Changer le thème"]
];

function menuText() {
  const style =
    Math.floor(
      Math.random() *
      FANCY_STYLES.length
    );

  const title =
    fancy(
      BOT_NAME,
      style
    );

  const lines = [];

  lines.push(
    `╭━━━〔 ${title} 〕━━━╮`
  );

  lines.push(
    `┃ 👑 Owner : ${OWNER_NAME}`
  );

  lines.push(
    `┃ ⚡ Version : ${VERSION}`
  );

  lines.push(
    `┃ 🔰 Prefix : ${PREFIX}`
  );

  lines.push(
    `╰━━━━━━━━━━━━━━━━╯`
  );

  lines.push("");

  const groups = {
    GENERAL: [],
    OWNER: [],
    GROUP: [],
    PROTECTION: [],
    MEDIA: [],
    FUN: []
  };

  const general = [
    "alive",
    "ping",
    "speed",
    "owner",
    "repo",
    "menu"
  ];

  const owner = [
    "sudo",
    "pair",
    "purge"
  ];

  const group = [
    "add",
    "ban",
    "kick",
    "promote",
    "demote",
    "tag",
    "tagall",
    "groupinfo",
    "listadmin",
    "staff",
    "link",
    "revoke",
    "groupname",
    "setgdesc",
    "left"
  ];

  const protection = [
    "antilink",
    "antipromote"
  ];

  const media = [
    "pinterest",
    "pin",
    "play",
    "song",
    "kiki",
    "take",
    "tourl",
    "ssweb",
    "getpp",
    "delete"
  ];

  const fun = [
    "couple",
    "couplepp",
    "afk",
    "fancy",
    "theme"
  ];

  for (
    const [cmd, desc]
    of COMMANDS
  ) {
    if (
      general.includes(cmd)
    ) {
      groups.GENERAL.push([
        cmd,
        desc
      ]);
    }

    else if (
      owner.includes(cmd)
    ) {
      groups.OWNER.push([
        cmd,
        desc
      ]);
    }

    else if (
      group.includes(cmd)
    ) {
      groups.GROUP.push([
        cmd,
        desc
      ]);
    }

    else if (
      protection.includes(cmd)
    ) {
      groups.PROTECTION.push([
        cmd,
        desc
      ]);
    }

    else if (
      media.includes(cmd)
    ) {
      groups.MEDIA.push([
        cmd,
        desc
      ]);
    }

    else if (
      fun.includes(cmd)
    ) {
      groups.FUN.push([
        cmd,
        desc
      ]);
    }
  }

  for (
    const [category, list]
    of Object.entries(groups)
  ) {
    lines.push(
      `╭─〔 ${category} 〕`
    );

    for (
      const [cmd, desc]
      of list
    ) {
      lines.push(
        `│ ${PREFIX}${cmd} — ${desc}`
      );
    }

    lines.push(
      `╰────────────`
    );

    lines.push("");
  }

  lines.push(
    `╰━━━〔 ${OWNER_TELEGRAM} 〕━━━╯`
  );

  return lines.join("\n");
}

// ===============================
// PARSER
// ===============================

function parseCommand(text) {
  if (
    !text.startsWith(PREFIX)
  ) {
    return null;
  }

  const body =
    text
      .slice(PREFIX.length)
      .trim();

  if (!body) {
    return null;
  }

  const parts =
    body.split(/\s+/);

  const command =
    parts
      .shift()
      .toLowerCase();

  return {
    command,
    args: parts,
    text: parts.join(" ")
  };
}

// ===============================
// CONTEXT
// ===============================

function getContext(
  message
) {
  return (
    message?.message
      ?.extendedTextMessage
      ?.contextInfo ||
    {}
  );
}

function getQuoted(
  message
) {
  return getContext(
    message
  )?.quotedMessage ||
    null;
}

function getMentioned(
  message
) {
  return (
    getContext(
      message
    )?.mentionedJid ||
    []
  );
}

function formatDuration(
  seconds
) {
  seconds =
    Math.floor(seconds);

  const h =
    Math.floor(
      seconds / 3600
    );

  const m =
    Math.floor(
      (seconds % 3600) /
      60
    );

  const s =
    seconds % 60;

  return [
    h ? `${h}h` : "",
    m ? `${m}m` : "",
    `${s}s`
  ]
    .filter(Boolean)
    .join(" ");
}

function cleanMention(
  jid
) {
  return `@${jidToNumber(jid)}`;
}

function sendMention(
  jid,
  text,
  mentions
) {
  return sock.sendMessage(
    jid,
    {
      text,
      mentions
    }
  );
}

async function requireGroup(
  jid
) {
  if (
    !isGroupJid(jid)
  ) {
    await sendText(
      jid,
      "❌ Cette commande fonctionne seulement dans un groupe."
    );

    return false;
  }

  return true;
}

async function requireAdmin(
  jid,
  sender
) {
  if (
    !await requireGroup(jid)
  ) {
    return false;
  }

  const metadata =
    await getGroupMetadata(
      jid
    );

  if (
    !hasOwnerAccess(sender) &&
    !isAdmin(
      metadata,
      sender
    )
  ) {
    await sendText(
      jid,
      "❌ Cette commande est réservée aux admins."
    );

    return false;
  }

  return metadata;
}

// ===============================
// AFK
// ===============================

function getAFK() {
  return readJSON(
    files.afk,
    {}
  );
}

function setAFK(
  jid,
  data
) {
  const afk =
    getAFK();

  if (
    data === null
  ) {
    delete afk[jid];
  } else {
    afk[jid] = data;
  }

  writeJSON(
    files.afk,
    afk
  );
}

// ===============================
// PROTECTION
// ===============================

function getProtection(
  jid
) {
  const protections =
    readJSON(
      files.protections,
      {}
    );

  return (
    protections[jid] || {
      antilink: false,
      antilinkAction:
        "delete",
      antipromote: false
    }
  );
}

function setProtection(
  jid,
  key,
  value
) {
  const protections =
    readJSON(
      files.protections,
      {}
    );

  if (
    !protections[jid]
  ) {
    protections[jid] = {
      antilink: false,
      antilinkAction:
        "delete",
      antipromote: false
    };
  }

  protections[jid][key] =
    value;

  writeJSON(
    files.protections,
    protections
  );
}

// ===============================
// MEDIA
// ===============================

async function downloadMedia(
  message,
  type
) {
  try {
    const stream =
      await downloadContentFromMessage(
        message,
        type
      );

    const chunks = [];

    for await (
      const chunk
      of stream
    ) {
      chunks.push(chunk);
    }

    return Buffer.concat(
      chunks
    );
  } catch {
    return null;
  }
}

function getMediaMessage(
  message
) {
  const m =
    message?.message;

  if (!m) {
    return null;
  }

  if (
    m.imageMessage
  ) {
    return {
      type: "image",
      message:
        m.imageMessage
    };
  }

  if (
    m.videoMessage
  ) {
    return {
      type: "video",
      message:
        m.videoMessage
    };
  }

  if (
    m.audioMessage
  ) {
    return {
      type: "audio",
      message:
        m.audioMessage
    };
  }

  if (
    m.stickerMessage
  ) {
    return {
      type: "sticker",
      message:
        m.stickerMessage
    };
  }

  return null;
}

// ===============================
// PINTEREST
// ===============================

async function pinterestSearch(
  query
) {
  const url =
    `https://api.giftedtech.co.ke/api/search/pinterest?apikey=gifted&query=${encodeURIComponent(query)}`;

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      "Pinterest API error"
    );
  }

  const data =
    await response.json();

  if (
    !data.success ||
    !data.result ||
    !data.result.length
  ) {
    throw new Error(
      "No Pinterest result"
    );
  }

  return data.result.slice(
    0,
    5
  );
}

// ===============================
// YOUTUBE PLAY
// ===============================

async function playYouTube(
  jid,
  query,
  quoted
) {
  try {
    const ytSearch =
      require("yt-search");

    const ytdl =
      require("@distube/ytdl-core");

    const result =
      await ytSearch(
        query
      );

    if (
      !result.videos ||
      !result.videos.length
    ) {
      throw new Error(
        "No result"
      );
    }

    const video =
      result.videos[0];

    await react(
      jid,
      quoted.key,
      "🎵"
    );

    const stream =
      ytdl(
        video.url,
        {
          filter:
            "audioonly",
          quality:
            "highestaudio"
        }
      );

    const chunks = [];

    for await (
      const chunk
      of stream
    ) {
      chunks.push(chunk);

      if (
        Buffer.concat(
          chunks
        ).length >
        15 * 1024 * 1024
      ) {
        throw new Error(
          "Audio too large"
        );
      }
    }

    const buffer =
      Buffer.concat(
        chunks
      );

    await sock.sendMessage(
      jid,
      {
        audio: buffer,
        mimetype:
          "audio/mpeg",
        fileName:
          `${video.title}.mp3`
      },
      {
        quoted
      }
    );

    await react(
      jid,
      quoted.key,
      "✅"
    );

  } catch (error) {
    console.error(
      "PLAY ERROR:",
      error.message
    );

    await sendText(
      jid,
      "❌ Impossible de télécharger cette musique."
    );
  }
}

// ===============================
// COMMAND HANDLER
// ===============================

async function handleCommand(
  message,
  jid,
  sender,
  parsed
) {
  const {
    command,
    args,
    text
  } = parsed;

  switch (command) {

    case "menu": {
      const caption =
        menuText();

      await sendImage(
        jid,
        getCurrentTheme(
          jid
        ).menu,
        caption,
        {
          quoted:
            message
        }
      );

      if (
        fs.existsSync(
          MENU_MUSIC
        )
      ) {
        await sock.sendMessage(
          jid,
          {
            audio:
              fs.readFileSync(
                MENU_MUSIC
              ),
            mimetype:
              "audio/mp4",
            ptt: false,
            fileName:
              "NICOLAS-ULTRA-XMD-MENU.m4a"
          },
          {
            quoted:
              message
          }
        );
      }

      return;
    }

    case "alive": {
      await sendImage(
        jid,
        getCurrentTheme(
          jid
        ).alive,
        `╭━━〔 ${BOT_NAME} 〕━━╮\n\n` +
        `🟢 Bot en ligne\n` +
        `⚡ Version : ${VERSION}\n` +
        `👑 Owner : ${OWNER_NAME}\n\n` +
        `╰━━━━━━━━━━━━╯`,
        {
          quoted:
            message
        }
      );

      return;
    }

    case "ping": {
      const start =
        Date.now();

      await react(
        jid,
        message.key,
        "🏓"
      );

      const speed =
        Date.now() -
        start;

      await sendImage(
        jid,
        OFFICIAL_IMAGES.ping,
        `🏓 Pong !\n\n⚡ ${speed} ms`,
        {
          quoted:
            message
        }
      );

      return;
    }

    case "speed": {
      const start =
        Date.now();

      await sleep(20);

      const speed =
        Date.now() -
        start;

      await sendText(
        jid,
        `⚡ Vitesse : ${speed} ms`
      );

      return;
    }

    case "owner": {
      if (!OWNER_NUMBER) {
        return sendText(
          jid,
          "👑 Owner non configuré."
        );
      }

      await sendText(
        jid,
        `👑 Voilà le dev du bot, bg : @${OWNER_NUMBER}\n\n` +
        `Évite de lui chercher des noises hein 😂\n` +
        `Il est tranquille, mais faut pas tester.\n\n` +
        `Respect au patron 🍫🎻`,
        {
          mentions: [
            OWNER_JID
          ]
        }
      );

      return;
    }

    case "repo": {
      await sendText(
        jid,
        `💻 ${BOT_NAME}\n\n` +
        `Version : ${VERSION}\n` +
        `Framework : Baileys\n` +
        `Créateur : ${OWNER_NAME}`
      );

      return;
    }

    case "help": {
      await sendText(
        jid,
        `╭━━〔 HELP 〕━━╮\n\n` +
        `📦 Commandes : ${COMMANDS.length}\n` +
        `⚙️ Prefix : ${PREFIX}\n` +
        `🤖 Version : ${VERSION}\n\n` +
        `Utilise ${PREFIX}list pour voir les commandes.\n` +
        `Utilise ${PREFIX}menu pour le menu complet.\n\n` +
        `╰━━━━━━━━━━━━╯`
      );

      return;
    }

    case "list": {
      const textList =
        COMMANDS
          .map(
            ([cmd, desc]) =>
              `${PREFIX}${cmd} — ${desc}`
          )
          .join("\n");

      await sendText(
        jid,
        `╭━━〔 COMMAND LIST 〕━━╮\n\n` +
        `${textList}\n\n` +
        `╰━━━━━━━━━━━━━━━━╯`
      );

      return;
    }

    case "sudo": {
      if (
        !isOwner(sender)
      ) {
        return sendText(
          jid,
          "❌ Seul Nicolas peut gérer les sudo."
        );
      }

      const action =
        args[0]?.toLowerCase();

      const sudo =
        getSudo();

      if (
        action === "list"
      ) {
        await sendText(
          jid,
          sudo.length
            ? `👑 Sudo :\n\n${sudo.map(x => `• ${x}`).join("\n")}`
            : "Aucun sudo."
        );

        return;
      }

      const target =
        getTargetJid(
          message
        );

      if (
        !target &&
        !args[1]
      ) {
        return sendText(
          jid,
          `Usage :\n${PREFIX}sudo add @user\n${PREFIX}sudo del @user\n${PREFIX}sudo list`
        );
      }

      const number =
        target
          ? jidToNumber(
              target
            )
          : normalizeNumber(
              args[1]
            );

      if (
        action === "add"
      ) {
        if (
          !sudo.includes(
            number
          )
        ) {
          sudo.push(
            number
          );

          writeJSON(
            files.sudo,
            sudo
          );
        }

        await sendText(
          jid,
          `✅ ${number} est maintenant sudo.`
        );

        return;
      }

      if (
        action === "del"
      ) {
        const filtered =
          sudo.filter(
            x =>
              normalizeNumber(
                x
              ) !==
              normalizeNumber(
                number
              )
          );

        writeJSON(
          files.sudo,
          filtered
        );

        await sendText(
          jid,
          `✅ Sudo retiré : ${number}`
        );

        return;
      }

      await sendText(
        jid,
        "❌ Action inconnue."
      );

      return;
    }

    case "pair": {
      if (
        !hasOwnerAccess(
          sender
        )
      ) {
        return sendText(
          jid,
          "❌ Commande réservée au staff."
        );
      }

      await sendText(
        jid,
        "🔐 Le système de pairing est lancé automatiquement au démarrage du bot."
      );

      return;
    }

    case "purge": {
      if (
        !hasOwnerAccess(
          sender
        )
      ) {
        return sendText(
          jid,
          "❌ Commande réservée au propriétaire."
        );
      }

      await sendText(
        jid,
        "🧹 Purge demandée."
      );

      return;
    }

    case "groupinfo": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      await sendText(
        jid,
        `╭━━〔 GROUP INFO 〕━━╮\n\n` +
        `🏷️ Nom : ${metadata.subject}\n` +
        `👥 Membres : ${metadata.participants.length}\n` +
        `👑 Admins : ${getGroupAdmins(metadata).length}\n\n` +
        `╰━━━━━━━━━━━━━━━━╯`
      );

      return;
    }

    case "listadmin":
    case "staff": {
      if (
        !await requireGroup(
          jid
        )
      )
        return;

      const metadata =
        await getGroupMetadata(
          jid
        );

      const admins =
        getGroupAdmins(
          metadata
        );

      const list =
        admins
          .map(
            x =>
              `• ${cleanMention(x)}`
          )
          .join("\n");

      await sendMention(
        jid,
        `👑 STAFF DU GROUPE\n\n${list}`,
        admins
      );

      return;
    }

    case "tag": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      const target =
        getTargetJid(
          message
        );

      if (!target) {
        return sendText(
          jid,
          "❌ Mentionne quelqu'un."
        );
      }

      await sendMention(
        jid,
        `👋 ${cleanMention(
          target
        )}`,
        [target]
      );

      return;
    }

    case "tagall": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      const mentions =
        metadata.participants
          .map(p => p.id);

      const body =
        args.length
          ? args.join(" ")
          : "📢 Tout le monde est appelé !";

      const tagText =
        mentions
          .map(
            x =>
              `@${jidToNumber(x)}`
          )
          .join(" ");

      await sendMention(
        jid,
        `${body}\n\n${tagText}`,
        mentions
      );

      return;
    }

    case "add": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      if (!args[0]) {
        return sendText(
          jid,
          "❌ Donne le numéro à ajouter."
        );
      }

      const number =
        normalizeNumber(
          args[0]
        );

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [
            `${number}@s.whatsapp.net`
          ],
          "add"
        );

        await sendText(
          jid,
          "✅ Membre ajouté."
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible d'ajouter ce membre."
        );
      }

      return;
    }

    case "kick":
    case "ban": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      const target =
        getTargetJid(
          message
        );

      if (!target) {
        return sendText(
          jid,
          "❌ Mentionne le membre à retirer."
        );
      }

      if (
        isOwner(target)
      ) {
        return sendText(
          jid,
          "💀 Tu veux virer Nicolas maintenant ? Non."
        );
      }

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [target],
          "remove"
        );

        await sendText(
          jid,
          `🛑 ${cleanMention(target)} a été retiré.`,
          {
            mentions: [
              target
            ]
          }
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de retirer ce membre."
        );
      }

      return;
    }

    case "promote":
    case "demote": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      const target =
        getTargetJid(
          message
        );

      if (!target) {
        return sendText(
          jid,
          "❌ Mentionne le membre."
        );
      }

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [target],
          command ===
          "promote"
            ? "promote"
            : "demote"
        );

        await sendText(
          jid,
          command ===
          "promote"
            ? `👑 ${cleanMention(target)} est maintenant admin.`
            : `📉 ${cleanMention(target)} n'est plus admin.`,
          {
            mentions: [
              target
            ]
          }
        );
      } catch {
        await sendText(
          jid,
          "❌ Action impossible."
        );
      }

      return;
    }

    case "link": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      try {
        const code =
          await sock.groupInviteCode(
            jid
          );

        await sendText(
          jid,
          `🔗 https://chat.whatsapp.com/${code}`
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de récupérer le lien."
        );
      }

      return;
    }

    case "revoke": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      try {
        await sock.groupRevokeInvite(
          jid
        );

        await sendText(
          jid,
          "✅ Nouveau lien généré."
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de réinitialiser le lien."
        );
      }

      return;
    }

    case "groupname": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      if (!text) {
        return sendText(
          jid,
          "Usage : .groupname Nouveau nom"
        );
      }

      try {
        await sock.groupUpdateSubject(
          jid,
          text
        );

        await sendText(
          jid,
          `✅ Nouveau nom : ${text}`
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de modifier le nom."
        );
      }

      return;
    }

    case "setgdesc": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      if (!text) {
        return sendText(
          jid,
          "Usage : .setgdesc nouvelle description"
        );
      }

      try {
        await sock.groupUpdateDescription(
          jid,
          text
        );

        await sendText(
          jid,
          "✅ Description modifiée."
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de modifier la description."
        );
      }

      return;
    }

    case "left": {
      if (
        !hasOwnerAccess(
          sender
        )
      ) {
        return sendText(
          jid,
          "❌ Seul le staff peut utiliser cette commande."
        );
      }

      if (
        !isGroupJid(jid)
      )
        return;

      await sendText(
        jid,
        "👋 Bon, je vous laisse les gars 😂"
      );

      await sleep(1000);

      await sock.groupLeave(
        jid
      );

      return;
    }

    case "antilink": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      const action =
        args[0]?.toLowerCase();

      if (
        action === "on"
      ) {
        setProtection(
          jid,
          "antilink",
          true
        );

        await sendText(
          jid,
          "🛡️ Antilink activé."
        );

        return;
      }

      if (
        action === "off"
      ) {
        setProtection(
          jid,
          "antilink",
          false
        );

        await sendText(
          jid,
          "🛡️ Antilink désactivé."
        );

        return;
      }

      if (
        ["kick", "delete"]
          .includes(action)
      ) {
        setProtection(
          jid,
          "antilinkAction",
          action
        );

        await sendText(
          jid,
          `🛡️ Action antilink : ${action}`
        );

        return;
      }

      const p =
        getProtection(
          jid
        );

      await sendText(
        jid,
        `🛡️ Antilink : ${p.antilink ? "ON" : "OFF"}\n` +
        `⚙️ Action : ${p.antilinkAction}`
      );

      return;
    }

    case "antipromote": {
      const metadata =
        await requireAdmin(
          jid,
          sender
        );

      if (!metadata)
        return;

      const action =
        args[0]?.toLowerCase();

      if (
        action === "on"
      ) {
        setProtection(
          jid,
          "antipromote",
          true
        );

        await sendText(
          jid,
          "🛡️ Antipromote activé."
        );

        return;
      }

      if (
        action === "off"
      ) {
        setProtection(
          jid,
          "antipromote",
          false
        );

        await sendText(
          jid,
          "🛡️ Antipromote désactivé."
        );

        return;
      }

      const p =
        getProtection(
          jid
        );

      await sendText(
        jid,
        `🛡️ Antipromote : ${p.antipromote ? "ON" : "OFF"}`
      );

      return;
    }

    case "afk": {
      if (
        args[0] === "list"
      ) {
        const afk =
          getAFK();

        const entries =
          Object.entries(
            afk
          );

        await sendText(
          jid,
          entries.length
            ? entries
                .map(
                  ([user, data]) =>
                    `• @${jidToNumber(user)} — ${data.reason || "AFK"}`
                )
                .join("\n")
            : "Personne n'est AFK."
        );

        return;
      }

      const reason =
        text ||
        "Je suis AFK.";

      setAFK(
        sender,
        {
          reason,
          time: Date.now()
        }
      );

      await sendText(
        jid,
        `💤 AFK activé.\n\n${reason}`
      );

      return;
    }

    case "fancy": {
      if (!text) {
        return sendText(
          jid,
          "Usage : .fancy ton texte"
        );
      }

      const style =
        Number(args[0]) ||
        1;

      const actualText =
        Number.isNaN(
          Number(args[0])
        )
          ? text
          : args
              .slice(1)
              .join(" ");

      await sendText(
        jid,
        fancy(
          actualText ||
            text,
          style
        )
      );

      return;
    }

    case "pinterest":
    case "pin": {
      if (!text) {
        return sendText(
          jid,
          "🔎 Donne une recherche.\nExemple : .pin anime pfp"
        );
      }

      await react(
        jid,
        message.key,
        "🔍"
      );

      try {
        const images =
          await pinterestSearch(
            text
          );

        for (
          const image of images
        ) {
          await sock.sendMessage(
            jid,
            {
              image: {
                url: image
              }
            },
            {
              quoted:
                message
            }
          );

          await sleep(300);
        }

        await react(
          jid,
          message.key,
          "✅"
        );

      } catch {
        await sendText(
          jid,
          "❌ Aucun résultat Pinterest trouvé."
        );
      }

      return;
    }

    case "couple": {
      if (
        !await requireGroup(
          jid
        )
      )
        return;

      const metadata =
        await getGroupMetadata(
          jid
        );

      const members =
        metadata.participants
          .map(
            p => p.id
          )
          .filter(
            x =>
              normalizeNumber(
                jidToNumber(x)
              ) !==
              normalizeNumber(
                jidToNumber(
                  sock.user.id
                )
              )
          );

      if (
        members.length < 2
      ) {
        return sendText(
          jid,
          "❌ Pas assez de membres."
        );
      }

      const target1 =
        getMentioned(
          message
        )[0];

      const target2 =
        getMentioned(
          message
        )[1];

      if (
        target1 &&
        target2
      ) {
        const percentage =
          Math.floor(
            Math.random() *
            101
          );

        await sendMention(
          jid,
          `💘 Compatibilité du jour :\n\n` +
          `${cleanMention(target1)} ❤️ ${cleanMention(target2)}\n\n` +
          `💞 Compatibilité : ${percentage}%\n\n` +
          `😂 C'est juste pour rigoler hein.`,
          [
            target1,
            target2
          ]
        );

        return;
      }

      let a =
        randomItem(
          members
        );

      let b =
        randomItem(
          members
        );

      while (
        b === a &&
        members.length > 1
      ) {
        b =
          randomItem(
            members
          );
      }

      await sendMention(
        jid,
        `💘 VOICI LES COUPLES DU JOUR 💘\n\n` +
        `${cleanMention(a)} ❤️ ${cleanMention(b)}\n\n` +
        `😂 Le hasard a parlé !`,
        [a, b]
      );

      return;
    }

    case "couplepp": {
      await react(
        jid,
        message.key,
        "💞"
      );

      try {
        const images =
          await pinterestSearch(
            "anime couple pfp half half matching profile picture"
          );

        const image =
          randomItem(
            images
          );

        await sock.sendMessage(
          jid,
          {
            image: {
              url: image
            },
            caption:
              "💞 PFP couple anime matching"
          },
          {
            quoted:
              message
          }
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de trouver une PFP couple pour le moment."
        );
      }

      return;
    }

    case "play":
    case "song": {
      if (!text) {
        return sendText(
          jid,
          `🎵 Usage : ${PREFIX}${command} nom de la musique`
        );
      }

      await playYouTube(
        jid,
        text,
        message
      );

      return;
    }

    case "getpp": {
      const target =
        getTargetJid(
          message
        ) ||
        sender;

      try {
        const url =
          await sock.profilePictureUrl(
            target,
            "image"
          );

        await sock.sendMessage(
          jid,
          {
            image: {
              url
            },
            caption:
              `🖼️ Photo de profil de @${jidToNumber(target)}`
          },
          {
            quoted:
              message,
            mentions: [
              target
            ]
          }
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de récupérer la photo de profil."
        );
      }

      return;
    }

    case "take": {
      const quoted =
        getQuoted(
          message
        );

      if (
        !quoted?.stickerMessage
      ) {
        return sendText(
          jid,
          "❌ Réponds à un sticker avec .take"
        );
      }

      try {
        const buffer =
          await downloadMedia(
            quoted,
            "sticker"
          );

        if (!buffer) {
          throw new Error(
            "No sticker"
          );
        }

        await sock.sendMessage(
          jid,
          {
            sticker:
              buffer
          },
          {
            quoted:
              message
          }
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de récupérer le sticker."
        );
      }

      return;
    }

    case "kiki": {
      await sendText(
        jid,
        "😂 Kiki est dans la place."
      );

      return;
    }

    case "delete": {
      const context =
        getContext(
          message
        );

      if (
        !context?.stanzaId
      ) {
        return sendText(
          jid,
          "❌ Réponds au message à supprimer."
        );
      }

      try {
        await sock.sendMessage(
          jid,
          {
            delete: {
              remoteJid:
                jid,
              fromMe:
                false,
              id:
                context.stanzaId,
              participant:
                context.participant
            }
          }
        );
      } catch {
        await sendText(
          jid,
          "❌ Impossible de supprimer ce message."
        );
      }

      return;
    }

    case "theme": {
      const requested =
        args[0]?.toLowerCase();

      if (
        !requested
      ) {
        return sendText(
          jid,
          `🎨 Thèmes disponibles :\n\n${THEMES.join(", ")}\n\n` +
          `Utilise ${PREFIX}theme nom`
        );
      }

      if (
        !setTheme(
          jid,
          requested
        )
      ) {
        return sendText(
          jid,
          "❌ Thème inconnu."
        );
      }

      await sendText(
        jid,
        `🎨 Thème changé : ${requested}`
      );

      return;
    }

    default:
      return;
  }
}

// ===============================
// MESSAGE HANDLER
// ===============================

async function handleMessage(
  message
) {
  try {
    if (
      !message?.message
    )
      return;

    if (
      message.key.fromMe
    )
      return;

    const jid =
      message.key.remoteJid;

    if (!jid)
      return;

    const sender =
      getSenderJid(
        message
      );

    const text =
      getText(
        message
      );

    const afk =
      getAFK();

    if (
      afk[sender]
    ) {
      const duration =
        formatDuration(
          (Date.now() -
            afk[sender].time) /
            1000
        );

      delete afk[sender];

      writeJSON(
        files.afk,
        afk
      );

      await sendText(
        jid,
        `👋 ${cleanMention(sender)} est de retour !\n` +
        `⏱️ AFK : ${duration}`,
        {
          mentions: [
            sender
          ]
        }
      );
    }

    if (
      isGroupJid(jid) &&
      text
    ) {
      const protection =
        getProtection(
          jid
        );

      if (
        protection.antilink &&
        /chat\.whatsapp\.com\/|https?:\/\/|www\./i.test(text)
      ) {
        const metadata =
          await getGroupMetadata(
            jid
          );

        if (
          !isAdmin(
            metadata,
            sender
          ) &&
          !hasOwnerAccess(
            sender
          )
        ) {
          if (
            protection.antilinkAction ===
            "delete"
          ) {
            try {
              await sock.sendMessage(
                jid,
                {
                  delete:
                    message.key
                }
              );
            } catch {}
          }

          if (
            protection.antilinkAction ===
            "kick"
          ) {
            if (
              isBotAdmin(
                metadata
              )
            ) {
              try {
                await sock.groupParticipantsUpdate(
                  jid,
                  [sender],
                  "remove"
                );
              } catch {}
            }
          }

          return;
        }
      }
    }

    const parsed =
      parseCommand(
        text
      );

    if (!parsed)
      return;

    await handleCommand(
      message,
      jid,
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

// ===============================
// GROUP PARTICIPANTS
// ===============================

async function handleParticipants(
  update
) {
  try {
    const {
      id,
      participants,
      action
    } = update;

    if (
      !["add", "remove"]
        .includes(action)
    ) {
      return;
    }

    await getGroupMetadata(
      id
    );

    const image =
      action === "add"
        ? OFFICIAL_IMAGES.welcome
        : OFFICIAL_IMAGES.goodbye;

    for (
      const participant
      of participants
    ) {
      const name =
        `@${jidToNumber(
          participant
        )}`;

      const text =
        action === "add"
          ? `👋 Bienvenue ${name} dans le groupe !\n\n🔥 Amuse-toi bien avec ${BOT_NAME}.`
          : `👋 ${name} nous quitte.\n\nÀ plus !`;

      try {
        await sock.sendMessage(
          id,
          {
            image: {
              url: image
            },
            caption: text,
            mentions: [
              participant
            ]
          }
        );
      } catch {
        try {
          await sendMention(
            id,
            text,
            [participant]
          );
        } catch {}
      }
    }

  } catch (
    error
  ) {
    console.error(
      "PARTICIPANT ERROR:",
      error
    );
  }
}

// ============================================================
// PAIRING SYSTEM
// ============================================================

async function requestPairingCode(
  state,
  generation,
  currentSocket
) {
  if (
    state.creds.registered
  ) {
    console.log(
      "🔐 Session WhatsApp déjà enregistrée."
    );

    return;
  }

  if (
    pairingRequested ||
    pairingInProgress
  ) {
    console.log(
      "⏳ Une demande de pairing est déjà en cours."
    );

    return;
  }

  const pairingNumber =
    normalizeNumber(
      process.env.PAIRING_NUMBER ||
      ""
    );

  if (!pairingNumber) {
    console.error("");
    console.error(
      "❌ PAIRING_NUMBER est absent de Railway."
    );
    console.error(
      "👉 Variable attendue : PAIRING_NUMBER"
    );
    console.error("");

    return;
  }

  if (
    pairingNumber.length < 8
  ) {
    console.error("");
    console.error(
      "❌ PAIRING_NUMBER semble invalide."
    );
    console.error("");

    return;
  }

  if (
    !currentSocket ||
    currentSocket !== sock
  ) {
    console.error(
      "❌ Socket WhatsApp indisponible."
    );

    return;
  }

  if (
    generation !== botGeneration
  ) {
    return;
  }

  pairingRequested =
    true;

  pairingInProgress =
    true;

  pairingSession =
    true;

  try {
    console.log("");
    console.log(
      "⏳ Préparation du pairing..."
    );

    /*
     * On attend un peu que le handshake initial
     * soit correctement établi.
     */
    await sleep(3000);

    if (
      generation !== botGeneration ||
      currentSocket !== sock
    ) {
      return;
    }

    if (
      state.creds.registered
    ) {
      console.log(
        "✅ Session enregistrée pendant le démarrage."
      );

      return;
    }

    console.log(
      "📱 Demande du code de pairing..."
    );

    const code =
      await currentSocket.requestPairingCode(
        pairingNumber
      );

    if (
      currentSocket !== sock ||
      generation !== botGeneration
    ) {
      console.log(
        "⚠️ Ancien socket de pairing ignoré."
      );

      return;
    }

    const cleanCode =
      String(code || "")
        .replace(/-/g, "")
        .trim();

    if (!cleanCode) {
      throw new Error(
        "WhatsApp n'a retourné aucun code."
      );
    }

    /*
     * Format visuel XXXX-XXXX.
     */
    const displayCode =
      cleanCode.length === 8
        ? `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`
        : cleanCode;

    console.log("");
    console.log(
      "╔══════════════════════════════════════╗"
    );
    console.log(
      "║       🔐 NICOLAS ULTRA XMD          ║"
    );
    console.log(
      "║           PAIRING CODE              ║"
    );
    console.log(
      "╠══════════════════════════════════════╣"
    );
    console.log(
      `║             ${displayCode}             ║`
    );
    console.log(
      "╠══════════════════════════════════════╣"
    );
    console.log(
      "║ WhatsApp → Appareils connectés      ║"
    );
    console.log(
      "║ → Connecter un appareil             ║"
    );
    console.log(
      "║ → Avec un numéro de téléphone       ║"
    );
    console.log(
      "╚══════════════════════════════════════╝"
    );
    console.log("");

    console.log(
      "📱 Entre maintenant le code dans WhatsApp."
    );

    console.log(
      "⏳ N'arrête pas Railway pendant le pairing."
    );

    console.log("");

  } catch (error) {
    const message =
      error?.message ||
      String(error);

    console.error("");
    console.error(
      "❌ ERREUR PAIRING :",
      message
    );

    console.log(
      "⚠️ La connexion de pairing a été interrompue."
    );

    /*
     * IMPORTANT :
     * On ne supprime jamais AUTH_DIR ici.
     */
    if (
      /401|428|405|connection closed|connection failure|bad-request/i.test(
        message
      )
    ) {
      console.log(
        "🔄 Une nouvelle tentative sera effectuée automatiquement."
      );
    }

  } finally {
    pairingInProgress =
      false;
  }
}

// ============================================================
// RECONNECT
// ============================================================

function scheduleReconnect(
  delay = 5000
) {
  if (
    reconnectTimer
  ) {
    return;
  }

  reconnectTimer =
    setTimeout(
      () => {
        reconnectTimer =
          null;

        pairingRequested =
          false;

        pairingInProgress =
          false;

        pairingSession =
          false;

        console.log("");
        console.log(
          "🔄 Nouvelle tentative de connexion..."
        );
        console.log("");

        startBot();
      },
      delay
    );
}

// ============================================================
// START BOT
// ============================================================

async function startBot() {
  if (
    starting
  ) {
    return;
  }

  starting =
    true;

  const generation =
    ++botGeneration;

  try {
    // =========================
    // AUTH
    // =========================

    const {
      state,
      saveCreds
    } =
      await useMultiFileAuthState(
        AUTH_DIR
      );

    // =========================
    // VERSION WHATSAPP WEB
    // =========================

    let version;

    try {
      const waVersion =
        await fetchLatestWaWebVersion();

      version =
        waVersion.version;

      console.log("");
      console.log(
        `🌐 WhatsApp Web : ${version.join(".")}`
      );

      console.log(
        `✅ Version actuelle : ${
          waVersion.isLatest
            ? "oui"
            : "non"
        }`);

    } catch (versionError) {
      console.error(
        "⚠️ Impossible de récupérer la version WhatsApp Web :",
        versionError?.message ||
        versionError
      );

      /*
       * On laisse Baileys utiliser sa version interne
       * plutôt que de casser complètement le démarrage.
       */
      version =
        undefined;
    }

    console.log("");
    console.log(
      `🚀 ${BOT_NAME} v${VERSION}`
    );

    console.log(
      "🔧 Initialisation de WhatsApp..."
    );

    if (
      state.creds.registered
    ) {
      console.log(
        "🔐 Session WhatsApp existante détectée."
      );
    } else {
      console.log(
        "🔐 Aucune session WhatsApp trouvée."
      );
    }

    // =========================
    // SOCKET
    // =========================

    const socketOptions = {
      auth: state,

      logger: pino({
        level:
          "silent"
      }),

      printQRInTerminal:
        false,

      /*
       * IMPORTANT :
       * navigateur canonique pour éviter
       * certains codes de pairing morts.
       */
      browser:
        Browsers.macOS(
          "Desktop"
        ),

      generateHighQualityLinkPreview:
        true,

      syncFullHistory:
        false,

      markOnlineOnConnect:
        false,

      connectTimeoutMs:
        60000,

      defaultQueryTimeoutMs:
        60000,

      keepAliveIntervalMs:
        30000
    };

    if (version) {
      socketOptions.version =
        version;
    }

    const newSocket =
      makeWASocket(
        socketOptions
      );

    sock =
      newSocket;

    // =========================
    // SAVE CREDENTIALS
    // =========================

    sock.ev.on(
      "creds.update",
      saveCreds
    );

    // ========================================================
    // CONNECTION UPDATE
    // ========================================================

    sock.ev.on(
      "connection.update",
      async update => {
        if (
          newSocket !== sock ||
          generation !== botGeneration
        ) {
          return;
        }

        const {
          connection,
          lastDisconnect
        } = update;

        // =====================
        // CONNECTING
        // =====================

        if (
          connection ===
          "connecting"
        ) {
          console.log(
            "🔄 Connexion à WhatsApp..."
          );

          return;
        }

        // =====================
        // CONNECTÉ
        // =====================

        if (
          connection ===
          "open"
        ) {
          console.log("");
          console.log(
            "╔══════════════════════════════════════╗"
          );
          console.log(
            "║     🟢 NICOLAS ULTRA XMD CONNECTÉ  ║"
          );
          console.log(
            `║              v${VERSION}              ║`
          );
          console.log(
            "╚══════════════════════════════════════╝"
          );
          console.log("");

          starting =
            false;

          pairingRequested =
            false;

          pairingInProgress =
            false;

          pairingSession =
            false;

          if (
            reconnectTimer
          ) {
            clearTimeout(
              reconnectTimer
            );

            reconnectTimer =
              null;
          }

          return;
        }

        // =====================
        // FERMÉ
        // =====================

        if (
          connection ===
          "close"
        ) {
          starting =
            false;

          const statusCode =
            lastDisconnect
              ?.error
              ?.output
              ?.statusCode;

          const errorMessage =
            lastDisconnect
              ?.error
              ?.message ||
            "";

          console.log("");

          console.log(
            `❌ Connexion fermée : ${
              statusCode ||
              "inconnu"
            }`
          );

          if (
            errorMessage
          ) {
            console.log(
              `⚠️ ${errorMessage}`
            );
          }

          // ===================
          // SESSION INVALIDÉE
          // ===================

          if (
            statusCode ===
            DisconnectReason.loggedOut
          ) {
            console.log("");

            if (
              state.creds.registered
            ) {
              console.log(
                "🔴 SESSION WHATSAPP INVALIDÉE."
              );

              console.log(
                "🧹 Cette session enregistrée n'est plus valide."
              );

              console.log(
                `📁 AUTH : ${AUTH_DIR}`
              );

              console.log(
                "➡️ Supprime uniquement l'ancienne session AUTH puis relance Railway."
              );

              console.log("");

              return;
            }

            /*
             * Si aucun compte n'était enregistré,
             * on ne détruit rien et on retente.
             */
            console.log(
              "⚠️ Fermeture pendant le premier pairing."
            );

            pairingRequested =
              false;

            pairingInProgress =
              false;

            pairingSession =
              false;

            scheduleReconnect(
              7000
            );

            return;
          }

          // ===================
          // 401 / PAIRING NEUF
          // ===================

          if (
            statusCode ===
              401 &&
            !state.creds.registered
          ) {
            console.log("");
            console.log(
              "⚠️ 401 reçu pendant le pairing initial."
            );

            console.log(
              "❌ Le socket de pairing vient de fermer."
            );

            console.log(
              "🔄 Nouvelle tentative automatique."
            );

            console.log("");

            pairingRequested =
              false;

            pairingInProgress =
              false;

            pairingSession =
              false;

            scheduleReconnect(
              7000
            );

            return;
          }

          // ===================
          // 428
          // ===================

          if (
            statusCode ===
            428
          ) {
            console.log("");
            console.log(
              "⚠️ WhatsApp a fermé la connexion avec 428."
            );

            console.log(
              "🔄 Nouvelle tentative automatique."
            );
            console.log("");

            pairingRequested =
              false;

            pairingInProgress =
              false;

            pairingSession =
              false;

            scheduleReconnect(
              7000
            );

            return;
          }

          // ===================
          // 405
          // ===================

          if (
            statusCode ===
            405
          ) {
            console.log("");
            console.log(
              "⚠️ WhatsApp a refusé la version/client."
            );

            console.log(
              "🌐 Une nouvelle version WhatsApp Web sera récupérée au prochain démarrage."
            );

            console.log("");

            pairingRequested =
              false;

            pairingInProgress =
              false;

            pairingSession =
              false;

            scheduleReconnect(
              8000
            );

            return;
          }

          // ===================
          // RESTART REQUIRED
          // ===================

          if (
            statusCode ===
            DisconnectReason.restartRequired
          ) {
            console.log(
              "🔄 WhatsApp demande un redémarrage du socket."
            );

            pairingRequested =
              false;

            pairingInProgress =
              false;

            pairingSession =
              false;

            scheduleReconnect(
              3000
            );

            return;
          }

          // ===================
          // RECONNEXION NORMALE
          // ===================

          pairingRequested =
            false;

          pairingInProgress =
            false;

          pairingSession =
            false;

          scheduleReconnect(
            5000
          );
        }
      }
    );

    // =========================
    // MESSAGES
    // =========================

    sock.ev.on(
      "messages.upsert",
      async ({
        messages,
        type
      }) => {
        if (
          type !== "notify"
        ) {
          return;
        }

        for (
          const message
          of messages
        ) {
          await handleMessage(
            message
          );
        }
      }
    );

    // =========================
    // GROUP PARTICIPANTS
    // =========================

    sock.ev.on(
      "group-participants.update",
      handleParticipants
    );

    // =========================
    // PAIRING
    // =========================

    if (
      !state.creds.registered
    ) {
      /*
       * Petit délai initial.
       * Le code est demandé sur CE socket uniquement.
       */
      await sleep(1500);

      if (
        generation !== botGeneration ||
        newSocket !== sock
      ) {
        return;
      }

      await requestPairingCode(
        state,
        generation,
        newSocket
      );

    } else {
      console.log(
        "🔐 Session WhatsApp existante : connexion automatique."
      );
    }

    starting =
      false;

  } catch (error) {
    starting =
      false;

    console.error("");

    console.error(
      "❌ START ERROR :",
      error?.message ||
      error
    );

    console.error("");

    pairingRequested =
      false;

    pairingInProgress =
      false;

    pairingSession =
      false;

    scheduleReconnect(
      10000
    );
  }
}

// ===============================
// GLOBAL ERRORS
// ===============================

process.on(
  "uncaughtException",
  error => {
    console.error(
      "UNCAUGHT:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "REJECTION:",
      error
    );
  }
);

// ===============================
// START
// ===============================

console.log("");
console.log(
  `🚀 ${BOT_NAME} v${VERSION}`
);
console.log("");

if (
  !process.env.PAIRING_NUMBER
) {
  console.error(
    "⚠️ PAIRING_NUMBER n'est pas défini dans Railway."
  );
} else {
  console.log(
    "📱 PAIRING_NUMBER détecté."
  );
}

console.log("");

startBot();
