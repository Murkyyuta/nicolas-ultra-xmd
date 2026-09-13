require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");

// ═══════════════════════════════════════
// 🔥 NICOLAS ULTRA XMD
// ═══════════════════════════════════════

const BOT_NAME = "NICOLAS ULTRA XMD";
const VERSION = "1.0.0";
const PREFIX = ".";

const AUTH_DIR = "/app/auth_info_baileys";

const OWNER_NAME = "Nicolas";
const OWNER_NUMBER = "242067904938";
const OWNER_TELEGRAM = "@Sage_ou_Nicolas";

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

// ═══════════════════════════════════════
// 🧰 OUTILS
// ═══════════════════════════════════════

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function jidToNumber(jid = "") {
  return jid.split("@")[0].split(":")[0];
}

function isGroupJid(jid = "") {
  return jid.endsWith("@g.us");
}

function getText(message) {
  const msg = message.message;
  if (!msg) return "";

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    ""
  );
}

async function react(sock, jid, message, emoji) {
  try {
    await sock.sendMessage(jid, {
      react: {
        text: emoji,
        key: message.key
      }
    });
  } catch {}
}

async function getGroupAdmins(sock, groupJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid);

    return metadata.participants
      .filter(
        p =>
          p.admin === "admin" ||
          p.admin === "superadmin"
      )
      .map(p => p.id);
  } catch {
    return [];
  }
}

async function isAdmin(sock, groupJid, userJid) {
  const admins = await getGroupAdmins(sock, groupJid);
  return admins.includes(userJid);
}

function getTargetJid(message, args) {
  const mentioned =
    message.message?.extendedTextMessage
      ?.contextInfo?.mentionedJid;

  if (mentioned?.length) {
    return mentioned[0];
  }

  if (args[0]?.startsWith("@")) {
    return (
      args[0].replace("@", "") +
      "@s.whatsapp.net"
    );
  }

  return null;
}

// ═══════════════════════════════════════
// 📋 MENU
// ═══════════════════════════════════════

function menuText() {
  return `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🔥 *${BOT_NAME}*
┃ ⚔️ Version ${VERSION}
╰━━━━━━━━━━━━━━━━━━━━━━╯

🎀 *GENERAL*
${PREFIX}alive
${PREFIX}ping
${PREFIX}speed
${PREFIX}owner
${PREFIX}repo
${PREFIX}menu

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
${PREFIX}waifu

🤖 *AI*
${PREFIX}ai
${PREFIX}chatbot
${PREFIX}tts
${PREFIX}imagine
${PREFIX}manga
${PREFIX}pixelart
${PREFIX}traduc

🛠️ *TOOLS*
${PREFIX}sticker
${PREFIX}photo
${PREFIX}attp
${PREFIX}take
${PREFIX}textmaker
${PREFIX}url
${PREFIX}kiki

🎨 *THEMES*
${PREFIX}theme solo
${PREFIX}theme naruto
${PREFIX}theme onepiece
${PREFIX}theme bleach
${PREFIX}theme demon
${PREFIX}theme dragonball
${PREFIX}theme jujutsu
${PREFIX}theme aot
${PREFIX}theme hxh
${PREFIX}theme blackclover

🍫🎻 *Nicolas Ultra XMD*
`;
}

// ═══════════════════════════════════════
// 🔥 VARIABLES
// ═══════════════════════════════════════

let sock = null;
let reconnectTimer = null;
let starting = false;
let pairingRequested = false;
let pairingTimeout = null;

// ═══════════════════════════════════════
// 🚀 DÉMARRAGE
// ═══════════════════════════════════════

async function startBot() {
  if (starting) return;

  starting = true;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, {
        recursive: true
      });
    }

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔥 NICOLAS ULTRA XMD");
    console.log("🚀 Démarrage...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(AUTH_DIR);

    const {
      version
    } = await fetchLatestBaileysVersion();

    console.log(
      "📡 Version WhatsApp Web :",
      version.join(".")
    );

    console.log(
      "📱 Session déjà enregistrée :",
      state.creds.registered
    );

    sock = makeWASocket({
      version,
      auth: state,

      logger: pino({
        level: "silent"
      }),

      printQRInTerminal: false,

      // Navigateur standard pour éviter
      // les problèmes de pairing liés
      // aux identifiants personnalisés.
      browser: [
        "Ubuntu",
        "Chrome",
        "22.04.4"
      ],

      connectTimeoutMs: 120000,

      defaultQueryTimeoutMs: 60000,

      keepAliveIntervalMs: 10000,

      markOnlineOnConnect: false,

      syncFullHistory: false,

      shouldSyncHistoryMessage: () => false,

      generateHighQualityLinkPreview: false
    });

    sock.ev.on(
      "creds.update",
      saveCreds
    );

    // ═══════════════════════════════════
    // 🔌 CONNEXION WHATSAPP
    // ═══════════════════════════════════

    sock.ev.on(
      "connection.update",
      async update => {

        // Affichage complet pour diagnostic
        console.log(
          "📡 UPDATE WHATSAPP :",
          JSON.stringify(
            update,
            null,
            2
          )
        );

        const {
          connection,
          lastDisconnect,
          qr
        } = update;

        console.log(
          "📡 Connection state :",
          connection || "undefined"
        );

        console.log(
          "📡 QR reçu :",
          Boolean(qr)
        );

        // ═══════════════════════════════
        // 📱 PAIRING CODE
        // ═══════════════════════════════

        if (
          !state.creds.registered &&
          !pairingRequested &&
          (
            connection === "connecting" ||
            Boolean(qr)
          )
        ) {

          pairingRequested = true;

          const phoneNumber =
            process.env.PAIRING_NUMBER?.trim();

          console.log(
            "🔎 PAIRING_NUMBER présent :",
            Boolean(phoneNumber)
          );

          if (!phoneNumber) {

            console.error(
              "❌ PAIRING_NUMBER MANQUANT"
            );

            pairingRequested = false;
            starting = false;

            return;
          }

          const cleanNumber =
            phoneNumber.replace(
              /\D/g,
              ""
            );

          if (!cleanNumber) {

            console.error(
              "❌ PAIRING_NUMBER INVALIDE"
            );

            pairingRequested = false;
            starting = false;

            return;
          }

          console.log(
            "📱 Numéro de pairing détecté."
          );

          console.log(
            "🔄 Attente du socket WhatsApp..."
          );

          pairingTimeout =
            setTimeout(
              async () => {

                try {

                  if (
                    state.creds.registered
                  ) {
                    console.log(
                      "ℹ️ Session déjà enregistrée."
                    );

                    return;
                  }

                  console.log(
                    "🔄 Demande du pairing code..."
                  );

                  const code =
                    await sock.requestPairingCode(
                      cleanNumber
                    );

                  console.log("");
                  console.log(
                    "━━━━━━━━━━━━━━━━━━━━━━╮"
                  );
                  console.log(
                    "┃ 🔥 PAIRING CODE"
                  );
                  console.log(
                    `┃    ${code}`
                  );
                  console.log(
                    "╰━━━━━━━━━━━━━━━━━━━━━━╯"
                  );
                  console.log("");

                  console.log(
                    "📱 WhatsApp → Paramètres"
                  );

                  console.log(
                    "➡️ Appareils connectés"
                  );

                  console.log(
                    "➡️ Connecter un appareil"
                  );

                  console.log(
                    "➡️ Utiliser un numéro de téléphone"
                  );

                  console.log("");

                  console.log(
                    "⚠️ Entre le code rapidement."
                  );

                } catch (error) {

                  console.error("");
                  console.error(
                    "❌ ERREUR PAIRING CODE"
                  );

                  console.error(
                    error?.message ||
                    error
                  );

                  if (
                    error?.output?.statusCode
                  ) {
                    console.error(
                      "📛 Status :",
                      error.output.statusCode
                    );
                  }

                  if (
                    error?.data?.statusCode
                  ) {
                    console.error(
                      "📛 Data status :",
                      error.data.statusCode
                    );
                  }

                  console.error("");

                  pairingRequested = false;
                }

              },
              1500
            );
        }

        // ═══════════════════════════════
        // 🟢 CONNECTÉ
        // ═══════════════════════════════

        if (
          connection === "open"
        ) {

          if (pairingTimeout) {

            clearTimeout(
              pairingTimeout
            );

            pairingTimeout = null;
          }

          starting = false;

          pairingRequested = false;

          console.log("");
          console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
          );
          console.log(
            "┃ 🟢 WHATSAPP CONNECTÉ !"
          );
          console.log(
            `┃ 🔥 ${BOT_NAME}`
          );
          console.log(
            "┃ ⚔️ Shadow Monarch Mode"
          );
          console.log(
            "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"
          );
          console.log("");

          try {

            await sock.sendPresenceUpdate(
              "available"
            );

          } catch {}
        }

        // ═══════════════════════════════
        // 🔴 FERMETURE
        // ═══════════════════════════════

        if (
          connection === "close"
        ) {

          starting = false;

          if (pairingTimeout) {

            clearTimeout(
              pairingTimeout
            );

            pairingTimeout = null;
          }

          const error =
            lastDisconnect?.error;

          const statusCode =
            error?.output?.statusCode ||
            error?.data?.statusCode ||
            error?.statusCode;

          console.log("");
          console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
          );
          console.log(
            "┃ 🔴 CONNEXION WHATSAPP FERMÉE"
          );
          console.log(
            "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"
          );

          console.log(
            "📛 Code :",
            statusCode || "inconnu"
          );

          console.log(
            "📛 Erreur :",
            error?.message ||
            "inconnue"
          );

          // ═════════════════════════════
          // 401 = SESSION INVALIDE
          // ═════════════════════════════

          if (
            statusCode === 401
          ) {

            console.log(
              "⚠️ Session WhatsApp invalide."
            );

            pairingRequested = false;

            try {

              if (
                fs.existsSync(
                  AUTH_DIR
                )
              ) {

                fs.rmSync(
                  AUTH_DIR,
                  {
                    recursive: true,
                    force: true
                  }
                );

                console.log(
                  "🧹 Ancienne session supprimée."
                );
              }

            } catch (e) {

              console.error(
                "⚠️ Nettoyage impossible :",
                e.message
              );
            }
          }

          // ═════════════════════════════
          // 428 = SOCKET FERMÉ
          // ═════════════════════════════

          if (
            statusCode === 428
          ) {

            console.log(
              "⚠️ WhatsApp/Baileys a fermé le socket."
            );

            console.log(
              "🔄 Nouvelle tentative..."
            );

            pairingRequested = false;
          }

          // ═════════════════════════════
          // LOGGED OUT
          // ═════════════════════════════

          if (
            statusCode ===
            DisconnectReason.loggedOut
          ) {

            console.log(
              "🚪 Session déconnectée définitivement."
            );

            return;
          }

          // ═════════════════════════════
          // RECONNEXION
          // ═════════════════════════════

          if (
            !reconnectTimer
          ) {

            console.log(
              "🔄 Reconnexion dans 5 secondes..."
            );

            reconnectTimer =
              setTimeout(
                () => {

                  reconnectTimer = null;

                  pairingRequested = false;

                  startBot();

                },
                5000
              );
          }
        }
      }
    );

    // ═══════════════════════════════════
    // 💬 MESSAGES
    // ═══════════════════════════════════

    sock.ev.on(
      "messages.upsert",
      async ({ messages }) => {

        try {

          const message =
            messages[0];

          if (!message) return;

          if (
            message.key.fromMe
          ) return;

          if (
            !message.message
          ) return;

          const jid =
            message.key.remoteJid;

          if (!jid) return;

          const text =
            getText(message).trim();

          if (!text) return;

          const lower =
            text.toLowerCase();

          const isGroup =
            isGroupJid(jid);

          // ═════════════════════════════
          // 👋 RÉPONSES RAPIDES
          // ═════════════════════════════

          if (
            [
              "salut",
              "slt",
              "yo",
              "bonjour"
            ].includes(lower)
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "🔥 Salut ! Nicolas Ultra XMD est là 🍫🎻"
              }
            );

            return;
          }

          if (
            [
              "cv",
              "ça va",
              "ca va"
            ].includes(lower)
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "Ça va tranquille 😎🔥 et toi ? 🍫🎻"
              }
            );

            return;
          }

          // ═════════════════════════════
          // 📌 COMMANDES
          // ═════════════════════════════

          if (
            !text.startsWith(PREFIX)
          ) return;

          const body =
            text
              .slice(PREFIX.length)
              .trim();

          if (!body) return;

          const parts =
            body.split(/\s+/);

          const command =
            parts
              .shift()
              .toLowerCase();

          const args = parts;

          // ═════════════════════════════
          // 🎀 MENU
          // ═════════════════════════════

          if (
            command === "menu"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  menuText()
              }
            );

            const reactions = [
              "🎀",
              "🪄",
              "🍫",
              "🎻",
              "🍟",
              "🍎",
              "🧿",
              "💎"
            ];

            for (
              const emoji of reactions
            ) {

              await sleep(350);

              await react(
                sock,
                jid,
                message,
                emoji
              );
            }

            return;
          }

          // ═════════════════════════════
          // 🟢 ALIVE
          // ═════════════════════════════

          if (
            command === "alive"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  `🔥 *${BOT_NAME} EST EN LIGNE*\n\n` +
                  `⚔️ Version : ${VERSION}\n` +
                  `👑 Owner : ${OWNER_NAME}\n` +
                  `🟢 Status : Online\n\n` +
                  `🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🏓 PING
          // ═════════════════════════════

          if (
            command === "ping"
          ) {

            const start =
              Date.now();

            await sock.sendMessage(
              jid,
              {
                text:
                  "🏓 Calcul..."
              }
            );

            const ping =
              Date.now() - start;

            await sock.sendMessage(
              jid,
              {
                text:
                  `🏓 Pong !\n⚡ ${ping} ms\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // ⚡ SPEED
          // ═════════════════════════════

          if (
            command === "speed"
          ) {

            const start =
              Date.now();

            const speed =
              Date.now() - start;

            await sock.sendMessage(
              jid,
              {
                text:
                  `⚡ Speed : ${speed} ms\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 👑 OWNER
          // ═════════════════════════════

          if (
            command === "owner"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  `👑 *OWNER*\n\n` +
                  `🔥 ${OWNER_NAME}\n` +
                  `📱 WhatsApp : +${OWNER_NUMBER}\n` +
                  `✈️ Telegram : ${OWNER_TELEGRAM}\n\n` +
                  `🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🔗 REPO
          // ═════════════════════════════

          if (
            command === "repo"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "🔥 Nicolas Ultra XMD\n" +
                  "⚔️ Shadow Monarch Edition\n" +
                  "📦 GitHub : nicolas-ultra-xmd\n\n" +
                  "🍫🎻"
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🎨 THEME
          // ═════════════════════════════

          if (
            command === "theme"
          ) {

            const theme =
              args[0]?.toLowerCase();

            if (!theme) {

              await sock.sendMessage(
                jid,
                {
                  text:
                    "🎨 *THÈMES DISPONIBLES*\n\n" +
                    THEMES
                      .map(
                        t => `• ${t}`
                      )
                      .join("\n") +
                    "\n\nExemple : .theme solo\n🍫🎻"
                }
              );

              return;
            }

            if (
              !THEMES.includes(theme)
            ) {

              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ Thème inconnu.\n\n" +
                    THEMES.join(", ") +
                    "\n🍫🎻"
                }
              );

              return;
            }

            await sock.sendMessage(
              jid,
              {
                text:
                  `🎨 Thème activé : *${theme}*\n⚔️ Shadow Monarch !\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🎱 8BALL
          // ═════════════════════════════

          if (
            command === "8ball"
          ) {

            const answers = [
              "Oui 😎",
              "Non 😂",
              "Peut-être 👀",
              "Très probablement 🔥",
              "Impossible 💀",
              "Demande plus tard 🗿",
              "Les étoiles disent oui ✨"
            ];

            await sock.sendMessage(
              jid,
              {
                text:
                  `🎱 ${randomItem(
                    answers
                  )}\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🪙 COINFLIP
          // ═════════════════════════════

          if (
            command === "coinflip"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  `🪙 Résultat : *${
                    Math.random() > 0.5
                      ? "PILE"
                      : "FACE"
                  }*\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🎲 ROLL
          // ═════════════════════════════

          if (
            command === "roll"
          ) {

            const max =
              parseInt(args[0]) || 6;

            const result =
              Math.floor(
                Math.random() * max
              ) + 1;

            await sock.sendMessage(
              jid,
              {
                text:
                  `🎲 Résultat : *${result}*\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 😂 BLAGUE
          // ═════════════════════════════

          if (
            command === "joke" ||
            command === "blague"
          ) {

            const jokes = [
              "Pourquoi les développeurs aiment le dark mode ? Parce que la lumière attire les bugs. 💀",
              "Mon code fonctionne parfaitement... jusqu'à ce que quelqu'un le regarde. 😭",
              "Pourquoi le bot est célibataire ? Parce qu'il n'a pas de connexion. 😂"
            ];

            await sock.sendMessage(
              jid,
              {
                text:
                  `😂 ${randomItem(
                    jokes
                  )}\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // ❤️ LOVE
          // ═════════════════════════════

          if (
            command === "love"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "❤️ L'amour c'est compliqué frère... mais ça vaut parfois le coup. 😭❤️\n🍫🎻"
              }
            );

            return;
          }

          // ═════════════════════════════
          // 😎 COMPLIMENT
          // ═════════════════════════════

          if (
            command === "compliment"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "😎 T'as une énergie de personnage principal 🔥\n🍫🎻"
              }
            );

            return;
          }

          // ═════════════════════════════
          // 😏 FLIRT
          // ═════════════════════════════

          if (
            command === "flirt"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "😏 Si le charme était une commande, tu serais déjà admin. 😂❤️\n🍫🎻"
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🤗 HUG
          // ═════════════════════════════

          if (
            command === "hug"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "🤗 Câlin virtuel envoyé !\n🍫🎻"
              }
            );

            return;
          }

          // ═════════════════════════════
          // 💋 KISS
          // ═════════════════════════════

          if (
            command === "kiss"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "💋 Bisou virtuel envoyé 😭❤️\n🍫🎻"
              }
            );

            return;
          }

          // ═════════════════════════════
          // 👋 SLAP
          // ═════════════════════════════

          if (
            command === "slap"
          ) {

            await sock.sendMessage(
              jid,
              {
                text:
                  "👋 PAF ! Réveille-toi frère 😂\n🍫🎻"
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🧠 FACT
          // ═════════════════════════════

          if (
            command === "fact"
          ) {

            const facts = [
              "🧠 Les poulpes ont trois cœurs.",
              "🌍 La Terre tourne autour du Soleil.",
              "🐙 Les poulpes peuvent changer de couleur."
            ];

            await sock.sendMessage(
              jid,
              {
                text:
                  `${randomItem(
                    facts
                  )}\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // ✋ TRUTH
          // ═════════════════════════════

          if (
            command === "truth"
          ) {

            const truths = [
              "👀 Qui est ton crush ?",
              "😂 Quelle est ta plus grosse honte ?",
              "❤️ As-tu déjà aimé quelqu'un en secret ?"
            ];

            await sock.sendMessage(
              jid,
              {
                text:
                  `✋ ${randomItem(
                    truths
                  )}\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 😈 DARE
          // ═════════════════════════════

          if (
            command === "dare"
          ) {

            const dares = [
              "😂 Envoie un emoji au hasard à la dernière personne à qui tu as parlé.",
              "🔥 Change ta photo de profil pendant 5 minutes.",
              "💀 Écris « je suis un génie » dans le groupe."
            ];

            await sock.sendMessage(
              jid,
              {
                text:
                  `😈 ${randomItem(
                    dares
                  )}\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // ✊ RPS
          // ═════════════════════════════

          if (
            command === "rps"
          ) {

            const choices = [
              "pierre",
              "papier",
              "ciseaux"
            ];

            await sock.sendMessage(
              jid,
              {
                text:
                  `✊ Mon choix : *${
                    randomItem(
                      choices
                    )
                  }*\n🍫🎻`
              }
            );

            return;
          }

          // ═════════════════════════════
          // 🧮 MATH
          // ═════════════════════════════

          if (
            command === "math"
          ) {

            const expression =
              args.join(" ");

            if (!expression) {

              await sock.sendMessage(
                jid,
                {
                  text:
                    "🧮 Exemple : .math 25 + 25\n🍫🎻"
                }
              );

              return;
            }

            if (
              !/^[0-9+\-*/().\s]+$/.test(
                expression
              )
            ) {

              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ Expression invalide.\n🍫🎻"
                }
              );

              return;
            }

            try {

              const result =
                Function(
                  `"use strict"; return (${expression})`
                )();

              await sock.sendMessage(
                jid,
                {
                  text:
                    `🧮 ${expression} = *${result}*\n🍫🎻`
                }
              );

            } catch {

              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ Impossible de calculer.\n🍫🎻"
                }
              );
            }

            return;
          }

          // ═════════════════════════════
          // 👥 COMMANDES GROUPES
          // ═════════════════════════════

          const groupCommands = [
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

          if (
            groupCommands.includes(
              command
            )
          ) {

            if (!isGroup) {

              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ Cette commande fonctionne uniquement dans un groupe.\n🍫🎻"
                }
              );

              return;
            }

            const sender =
              message.key.participant ||
              message.key.remoteJid;

            const admin =
              await isAdmin(
                sock,
                jid,
                sender
              );

            // GROUP INFO
            if (
              command === "groupinfo"
            ) {

              const metadata =
                await sock.groupMetadata(
                  jid
                );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `👥 *GROUP INFO*\n\n` +
                    `📛 Nom : ${metadata.subject}\n` +
                    `👤 Membres : ${metadata.participants.length}\n` +
                    `📝 Description : ${
                      metadata.desc ||
                      "Aucune"
                    }\n\n🍫🎻`
                }
              );

              return;
            }

            // STAFF
            if (
              command === "staff" ||
              command === "listadmin"
            ) {

              const admins =
                await getGroupAdmins(
                  sock,
                  jid
                );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `👑 *STAFF*\n\n` +
                    admins
                      .map(
                        (id, i) =>
                          `${i + 1}. @${jidToNumber(id)}`
                      )
                      .join("\n") +
                    "\n\n🍫🎻",
                  mentions: admins
                }
              );

              return;
            }

            // TAG ALL
            if (
              command === "tagall" ||
              command === "tag"
            ) {

              const metadata =
                await sock.groupMetadata(
                  jid
                );

              const members =
                metadata.participants.map(
                  p => p.id
                );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `📢 *TAG ALL*\n\n` +
                    members
                      .map(
                        id =>
                          `@${jidToNumber(id)}`
                      )
                      .join(" ") +
                    "\n\n🍫🎻",
                  mentions: members
                }
              );

              return;
            }

            if (!admin) {

              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ Cette commande nécessite les droits administrateur.\n🍫🎻"
                }
              );

              return;
            }

            const target =
              getTargetJid(
                message,
                args
              );

            // KICK / BAN
            if (
              command === "kick" ||
              command === "ban"
            ) {

              if (!target) {

                await sock.sendMessage(
                  jid,
                  {
                    text:
                      `❌ Mentionne quelqu'un.\nExemple : ${PREFIX}${command} @user\n🍫🎻`
                  }
                );

                return;
              }

              await sock.groupParticipantsUpdate(
                jid,
                [target],
                "remove"
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `🚫 @${jidToNumber(
                      target
                    )} a été retiré.\n🍫🎻`,
                  mentions: [
                    target
                  ]
                }
              );

              return;
            }

            // ADD
            if (
              command === "add"
            ) {

              const number =
                args[0]?.replace(
                  /\D/g,
                  ""
                );

              if (!number) {

                await sock.sendMessage(
                  jid,
                  {
                    text:
                      "❌ Exemple : .add 242XXXXXXXXX\n🍫🎻"
                  }
                );

                return;
              }

              const targetJid =
                `${number}@s.whatsapp.net`;

              await sock.groupParticipantsUpdate(
                jid,
                [targetJid],
                "add"
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `✅ @${number} ajouté.\n🍫🎻`,
                  mentions: [
                    targetJid
                  ]
                }
              );

              return;
            }

            // PROMOTE
            if (
              command === "promote"
            ) {

              if (!target) {

                await sock.sendMessage(
                  jid,
                  {
                    text:
                      "❌ Mentionne la personne.\n🍫🎻"
                  }
                );

                return;
              }

              await sock.groupParticipantsUpdate(
                jid,
                [target],
                "promote"
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `👑 @${jidToNumber(
                      target
                    )} est maintenant admin.\n🍫🎻`,
                  mentions: [
                    target
                  ]
                }
              );

              return;
            }

            // DEMOTE
            if (
              command === "demote"
            ) {

              if (!target) {

                await sock.sendMessage(
                  jid,
                  {
                    text:
                      "❌ Mentionne la personne.\n🍫🎻"
                  }
                );

                return;
              }

              await sock.groupParticipantsUpdate(
                jid,
                [target],
                "demote"
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `⬇️ @${jidToNumber(
                      target
                    )} n'est plus admin.\n🍫🎻`,
                  mentions: [
                    target
                  ]
                }
              );

              return;
            }

            // LINK
            if (
              command === "link"
            ) {

              const code =
                await sock.groupInviteCode(
                  jid
                );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `🔗 *LIEN DU GROUPE*\n\nhttps://chat.whatsapp.com/${code}\n\n🍫🎻`
                }
              );

              return;
            }

            // REVOKE
            if (
              command === "revoke"
            ) {

              await sock.groupRevokeInvite(
                jid
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    "🔐 Ancien lien révoqué.\n🍫🎻"
                }
              );

              return;
            }

            // GROUPNAME
            if (
              command === "groupname"
            ) {

              const name =
                args.join(" ").trim();

              if (!name) {

                await sock.sendMessage(
                  jid,
                  {
                    text:
                      "❌ Exemple : .groupname Nicolas Squad\n🍫🎻"
                  }
                );

                return;
              }

              await sock.groupUpdateSubject(
                jid,
                name
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    `✅ Nom changé en *${name}*\n🍫🎻`
                }
              );

              return;
            }

            // SETGDESC
            if (
              command === "setgdesc"
            ) {

              const desc =
                args.join(" ").trim();

              if (!desc) {

                await sock.sendMessage(
                  jid,
                  {
                    text:
                      "❌ Exemple : .setgdesc Bienvenue\n🍫🎻"
                  }
                );

                return;
              }

              await sock.groupUpdateDescription(
                jid,
                desc
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    "✅ Description modifiée.\n🍫🎻"
                }
              );

              return;
            }

            // LEFT
            if (
              command === "left"
            ) {

              await sock.sendMessage(
                jid,
                {
                  text:
                    "👋 Nicolas Ultra XMD quitte le groupe.\n🍫🎻"
                }
              );

              await sleep(1000);

              await sock.groupLeave(
                jid
              );

              return;
            }
          }

          // ═════════════════════════════
          // ❓ COMMANDE INCONNUE
          // ═════════════════════════════

          await sock.sendMessage(
            jid,
            {
              text:
                `❓ Commande inconnue : *${PREFIX}${command}*\n\n` +
                `Utilise *${PREFIX}menu*.\n🍫🎻`
            }
          );

        } catch (error) {

          console.error(
            "❌ ERREUR MESSAGE :",
            error
          );
        }
      }
    );

  } catch (error) {

    console.error(
      "❌ ERREUR DÉMARRAGE :",
      error
    );

    starting = false;

    if (!reconnectTimer) {

      reconnectTimer =
        setTimeout(
          () => {

            reconnectTimer = null;

            pairingRequested = false;

            startBot();

          },
          5000
        );
    }
  }
}

// ═══════════════════════════════════════
// 🛡️ ERREURS
// ═══════════════════════════════════════

process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ UNCAUGHT EXCEPTION :",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ UNHANDLED REJECTION :",
      error
    );
  }
);

// ═══════════════════════════════════════
// 🚀 START
// ═══════════════════════════════════════

startBot();
