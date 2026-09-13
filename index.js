require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function jidToNumber(jid = "") {
  return jid.split("@")[0].split(":")[0];
}

function isGroupJid(jid = "") {
  return jid.endsWith("@g.us");
}

function escapeText(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

// ═══════════════════════════════════════
// 👥 GROUPES
// ═══════════════════════════════════════

async function getGroupAdmins(sock, groupJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid);

    return metadata.participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
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
    message.message?.extendedTextMessage?.contextInfo?.mentionedJid;

  if (mentioned?.length) {
    return mentioned[0];
  }

  if (args[0]?.startsWith("@")) {
    return args[0].replace("@", "") + "@s.whatsapp.net";
  }

  return null;
}

// ═══════════════════════════════════════
// 🎀 MENU
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
// 🤖 BOT
// ═══════════════════════════════════════

let sock;
let reconnectTimer = null;
let isStarting = false;
let pairingRequested = false;

async function startBot() {
  if (isStarting) return;

  isStarting = true;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔥 DÉMARRAGE NICOLAS ULTRA XMD");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    const { version } =
      await fetchLatestBaileysVersion();

    console.log(
      "📡 WhatsApp Web version :",
      version.join(".")
    );

    sock = makeWASocket({
      version,

      auth: state,

      logger: pino({
        level: "silent"
      }),

      printQRInTerminal: false,

      // Configuration stable pour le pairing
      browser: Browsers.baileys(BOT_NAME),

      connectTimeoutMs: 120000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,

      markOnlineOnConnect: false,

      syncFullHistory: false,

      shouldSyncHistoryMessage: () => false,

      generateHighQualityLinkPreview: false
    });

    sock.ev.on("creds.update", saveCreds);

    // ═══════════════════════════════════
    // 🔥 PAIRING CODE
    // ═══════════════════════════════════

    sock.ev.on("connection.update", async update => {
      const {
        connection,
        lastDisconnect
      } = update;

      // ─────────────────────────────────
      // 📱 DEMANDE DU CODE
      // ─────────────────────────────────

      if (
        connection === "connecting" &&
        !state.creds.registered &&
        !pairingRequested
      ) {
        pairingRequested = true;

        const phoneNumber =
          process.env.PAIRING_NUMBER?.trim();

        if (!phoneNumber) {
          console.error("");
          console.error("❌ PAIRING_NUMBER MANQUANT");
          console.error(
            "Ajoute PAIRING_NUMBER dans Railway."
          );
          return;
        }

        const cleanNumber =
          phoneNumber.replace(/\D/g, "");

        console.log("");
        console.log(
          "📱 Numéro de pairing détecté"
        );
        console.log(
          "🔄 Demande du pairing code..."
        );

        try {
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
          console.log(
            "➡️ Entre le code affiché ci-dessus"
          );
          console.log("");

        } catch (error) {
          console.error("");
          console.error(
            "❌ ERREUR PAIRING CODE"
          );
          console.error(error);
          console.error("");
        }
      }

      // ─────────────────────────────────
      // 🟢 CONNECTÉ
      // ─────────────────────────────────

      if (connection === "open") {
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

        pairingRequested = false;
        isStarting = false;
      }

      // ─────────────────────────────────
      // 🔴 CONNEXION FERMÉE
      // ─────────────────────────────────

      if (connection === "close") {
        isStarting = false;

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

        if (statusCode === 401) {
          console.log(
            "⚠️ Session WhatsApp rejetée."
          );
          console.log(
            "⚠️ Une nouvelle authentification sera nécessaire."
          );

          pairingRequested = false;

          // On supprime seulement l'ancienne
          // authentification invalide
          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, {
                recursive: true,
                force: true
              });

              console.log(
                "🧹 Ancienne session supprimée."
              );
            }
          } catch (cleanupError) {
            console.error(
              "⚠️ Impossible de supprimer la session :",
              cleanupError.message
            );
          }

          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              startBot();
            }, 5000);
          }

          return;
        }

        if (
          statusCode === DisconnectReason.loggedOut
        ) {
          console.log(
            "🚪 Session déconnectée."
          );
          return;
        }

        // Reconnexion normale
        if (!reconnectTimer) {
          console.log(
            "🔄 Reconnexion dans 5 secondes..."
          );

          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            pairingRequested = false;
            startBot();
          }, 5000);
        }
      }
    });

    // ═══════════════════════════════════
    // 💬 MESSAGES
    // ═══════════════════════════════════

    sock.ev.on(
      "messages.upsert",
      async ({ messages }) => {
        try {
          const message = messages[0];

          if (!message) return;
          if (message.key.fromMe) return;
          if (!message.message) return;

          const jid =
            message.key.remoteJid;

          if (!jid) return;

          const text =
            getText(message).trim();

          if (!text) return;

          const isGroup =
            isGroupJid(jid);

          const lower =
            text.toLowerCase();

          // ═══════════════════════════════
          // 👋 RÉPONSES RAPIDES
          // ═══════════════════════════════

          if (
            lower === "salut" ||
            lower === "slt" ||
            lower === "yo" ||
            lower === "bonjour"
          ) {
            await sock.sendMessage(jid, {
              text:
                "🔥 Salut ! Nicolas Ultra XMD est là 🍫🎻"
            });
            return;
          }

          if (
            lower === "cv" ||
            lower === "ça va" ||
            lower === "ca va"
          ) {
            await sock.sendMessage(jid, {
              text:
                "Ça va tranquille 😎🔥 et toi ? 🍫🎻"
            });
            return;
          }

          // ═══════════════════════════════
          // 📌 COMMANDES
          // ═══════════════════════════════

          if (!text.startsWith(PREFIX)) {
            return;
          }

          const body =
            text.slice(PREFIX.length).trim();

          if (!body) return;

          const parts =
            body.split(/\s+/);

          const command =
            parts.shift().toLowerCase();

          const args = parts;

          // ═══════════════════════════════
          // 🎀 MENU
          // ═══════════════════════════════

          if (command === "menu") {
            await sock.sendMessage(jid, {
              text: menuText()
            });

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

            for (const emoji of reactions) {
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

          // ═══════════════════════════════
          // 🟢 ALIVE
          // ═══════════════════════════════

          if (command === "alive") {
            await sock.sendMessage(jid, {
              text:
                `🔥 *${BOT_NAME} EST EN LIGNE*\n\n` +
                `⚔️ Version : ${VERSION}\n` +
                `👑 Owner : ${OWNER_NAME}\n` +
                `🟢 Status : Online\n\n` +
                `🍫🎻`
            });
            return;
          }

          // ═══════════════════════════════
          // 🏓 PING
          // ═══════════════════════════════

          if (command === "ping") {
            const start = Date.now();

            await sock.sendMessage(jid, {
              text: "🏓 Calcul de la vitesse..."
            });

            const speed =
              Date.now() - start;

            await sock.sendMessage(jid, {
              text:
                `🏓 Pong !\n⚡ ${speed} ms\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // ⚡ SPEED
          // ═══════════════════════════════

          if (command === "speed") {
            const start = Date.now();

            await sock.sendMessage(jid, {
              text:
                `⚡ Speed test : ${
                  Date.now() - start
                } ms\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // 👑 OWNER
          // ═══════════════════════════════

          if (command === "owner") {
            await sock.sendMessage(jid, {
              text:
                `👑 *OWNER*\n\n` +
                `🔥 ${OWNER_NAME}\n` +
                `📱 WhatsApp : +${OWNER_NUMBER}\n` +
                `✈️ Telegram : ${OWNER_TELEGRAM}\n\n` +
                `🍫🎻`
            });
            return;
          }

          // ═══════════════════════════════
          // 🔗 REPO
          // ═══════════════════════════════

          if (command === "repo") {
            await sock.sendMessage(jid, {
              text:
                "🔥 Nicolas Ultra XMD\n" +
                "⚔️ Shadow Monarch Edition\n" +
                "📦 GitHub : nicolas-ultra-xmd\n\n" +
                "🍫🎻"
            });
            return;
          }

          // ═══════════════════════════════
          // 🎨 THEME
          // ═══════════════════════════════

          if (command === "theme") {
            const theme =
              args[0]?.toLowerCase();

            if (!theme) {
              await sock.sendMessage(jid, {
                text:
                  "🎨 *THÈMES DISPONIBLES*\n\n" +
                  THEMES
                    .map(t => `• ${t}`)
                    .join("\n") +
                  "\n\nExemple : .theme solo\n🍫🎻"
              });
              return;
            }

            if (!THEMES.includes(theme)) {
              await sock.sendMessage(jid, {
                text:
                  `❌ Thème inconnu.\n\n` +
                  `Thèmes disponibles :\n` +
                  THEMES.join(", ") +
                  "\n\n🍫🎻"
              });
              return;
            }

            await sock.sendMessage(jid, {
              text:
                `🎨 Thème changé : *${theme}*\n⚔️ Shadow Monarch activé !\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // 🎱 8BALL
          // ═══════════════════════════════

          if (command === "8ball") {
            const answers = [
              "Oui 😎",
              "Non 😂",
              "Peut-être 👀",
              "Très probablement 🔥",
              "Impossible 💀",
              "Demande encore plus tard 🗿",
              "Les étoiles disent oui ✨",
              "J'en sais rien frère 😭"
            ];

            await sock.sendMessage(jid, {
              text:
                `🎱 ${randomItem(answers)}\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // 🪙 COINFLIP
          // ═══════════════════════════════

          if (command === "coinflip") {
            await sock.sendMessage(jid, {
              text:
                `🪙 Résultat : ${
                  Math.random() > 0.5
                    ? "PILE"
                    : "FACE"
                }\n🍫🎻`
            });
            return;
          }

          // ═══════════════════════════════
          // 🎲 ROLL
          // ═══════════════════════════════

          if (command === "roll") {
            const max =
              parseInt(args[0]) || 6;

            const result =
              Math.floor(
                Math.random() * max
              ) + 1;

            await sock.sendMessage(jid, {
              text:
                `🎲 Résultat : *${result}*\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // 😂 BLAGUE
          // ═══════════════════════════════

          if (
            command === "joke" ||
            command === "blague"
          ) {
            const jokes = [
              "Pourquoi les développeurs aiment-ils le dark mode ? Parce que la lumière attire les bugs. 💀",
              "Mon code fonctionne parfaitement... jusqu'à ce que quelqu'un le regarde. 😭",
              "Pourquoi le bot est célibataire ? Parce qu'il n'a pas de connexion. 😂"
            ];

            await sock.sendMessage(jid, {
              text:
                `😂 ${randomItem(jokes)}\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // ❤️ LOVE
          // ═══════════════════════════════

          if (command === "love") {
            await sock.sendMessage(jid, {
              text:
                "❤️ L'amour c'est compliqué frère... mais ça vaut parfois le coup. 😭❤️\n🍫🎻"
            });
            return;
          }

          // ═══════════════════════════════
          // 😎 COMPLIMENT
          // ═══════════════════════════════

          if (command === "compliment") {
            await sock.sendMessage(jid, {
              text:
                `😎 T'as une énergie de personnage principal 🔥\n🍫🎻`
            });
            return;
          }

          // ═══════════════════════════════
          // 😏 FLIRT
          // ═══════════════════════════════

          if (command === "flirt") {
            await sock.sendMessage(jid, {
              text:
                "😏 Si le charme était une commande, je crois que tu serais déjà en mode admin. 😂❤️\n🍫🎻"
            });
            return;
          }

          // ═══════════════════════════════
          // 🤗 HUG
          // ═══════════════════════════════

          if (command === "hug") {
            await sock.sendMessage(jid, {
              text:
                "🤗 *Câlin virtuel envoyé !*\n🍫🎻"
            });
            return;
          }

          // ═══════════════════════════════
          // 💋 KISS
          // ═══════════════════════════════

          if (command === "kiss") {
            await sock.sendMessage(jid, {
              text:
                "💋 Bisou virtuel envoyé 😭❤️\n🍫🎻"
            });
            return;
          }

          // ═══════════════════════════════
          // 👋 SLAP
          // ═══════════════════════════════

          if (command === "slap") {
            await sock.sendMessage(jid, {
              text:
                "👋 *PAF !* Réveille-toi frère 😂\n🍫🎻"
            });
            return;
          }

          // ═══════════════════════════════
          // 🧠 FACT
          // ═══════════════════════════════

          if (command === "fact") {
            const facts = [
              "🧠 Les poulpes ont trois cœurs.",
              "🌍 La Terre tourne autour du Soleil.",
              "⚡ La lumière voyage extrêmement rapidement.",
              "🐙 Les poulpes peuvent changer de couleur."
            ];

            await sock.sendMessage(jid, {
              text:
                `${randomItem(facts)}\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // ✋ TRUTH
          // ═══════════════════════════════

          if (command === "truth") {
            const truths = [
              "👀 Qui est ton crush ?",
              "😂 Quelle est ta plus grosse honte ?",
              "❤️ As-tu déjà aimé quelqu'un en secret ?",
              "💀 Quel est ton plus gros mensonge ?"
            ];

            await sock.sendMessage(jid, {
              text:
                `✋ ${randomItem(truths)}\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // 😈 DARE
          // ═══════════════════════════════

          if (command === "dare") {
            const dares = [
              "😂 Envoie un emoji au hasard à la dernière personne à qui tu as parlé.",
              "🔥 Change ta photo de profil pendant 5 minutes.",
              "💀 Écris simplement « je suis un génie » dans le groupe."
            ];

            await sock.sendMessage(jid, {
              text:
                `😈 ${randomItem(dares)}\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // ✊ RPS
          // ═══════════════════════════════

          if (command === "rps") {
            const choices = [
              "pierre",
              "papier",
              "ciseaux"
            ];

            const botChoice =
              randomItem(choices);

            await sock.sendMessage(jid, {
              text:
                `✊ Mon choix : *${botChoice}*\n🍫🎻`
            });

            return;
          }

          // ═══════════════════════════════
          // ➕ MATH
          // ═══════════════════════════════

          if (command === "math") {
            const expression =
              args.join(" ");

            if (!expression) {
              await sock.sendMessage(jid, {
                text:
                  "🧮 Exemple : .math 25 + 25\n🍫🎻"
              });
              return;
            }

            if (
              !/^[0-9+\-*/().\s]+$/.test(
                expression
              )
            ) {
              await sock.sendMessage(jid, {
                text:
                  "❌ Expression invalide.\n🍫🎻"
              });
              return;
            }

            try {
              const result =
                Function(
                  `"use strict"; return (${expression})`
                )();

              await sock.sendMessage(jid, {
                text:
                  `🧮 ${expression} = *${result}*\n🍫🎻`
              });
            } catch {
              await sock.sendMessage(jid, {
                text:
                  "❌ Impossible de calculer.\n🍫🎻"
              });
            }

            return;
          }

          // ═══════════════════════════════
          // 👥 COMMANDES GROUPES
          // ═══════════════════════════════

          if (
            [
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
            ].includes(command)
          ) {
            if (!isGroup) {
              await sock.sendMessage(jid, {
                text:
                  "❌ Cette commande fonctionne uniquement dans un groupe.\n🍫🎻"
              });
              return;
            }

            const admin =
              await isAdmin(
                sock,
                jid,
                message.key.participant ||
                  message.key.remoteJid
              );

            // ─────────────────────────────
            // GROUPINFO
            // ─────────────────────────────

            if (command === "groupinfo") {
              const metadata =
                await sock.groupMetadata(jid);

              await sock.sendMessage(jid, {
                text:
                  `👥 *GROUP INFO*\n\n` +
                  `📛 Nom : ${metadata.subject}\n` +
                  `👤 Membres : ${metadata.participants.length}\n` +
                  `📝 Description : ${metadata.desc || "Aucune"}\n\n` +
                  `🍫🎻`
              });

              return;
            }

            // ─────────────────────────────
            // STAFF
            // ─────────────────────────────

            if (
              command === "staff" ||
              command === "listadmin"
            ) {
              const admins =
                await getGroupAdmins(
                  sock,
                  jid
                );

              await sock.sendMessage(jid, {
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
              });

              return;
            }

            // ─────────────────────────────
            // TAGALL
            // ─────────────────────────────

            if (command === "tagall") {
              const metadata =
                await sock.groupMetadata(jid);

              const members =
                metadata.participants.map(
                  p => p.id
                );

              await sock.sendMessage(jid, {
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
              });

              return;
            }

            // ─────────────────────────────
            // TAG
            // ─────────────────────────────

            if (command === "tag") {
              const metadata =
                await sock.groupMetadata(jid);

              const members =
                metadata.participants.map(
                  p => p.id
                );

              await sock.sendMessage(jid, {
                text:
                  members
                    .map(
                      id =>
                        `@${jidToNumber(id)}`
                    )
                    .join(" ") +
                  "\n🍫🎻",
                mentions: members
              });

              return;
            }

            // ─────────────────────────────
            // COMMANDES ADMIN
            // ─────────────────────────────

            if (!admin) {
              await sock.sendMessage(jid, {
                text:
                  "❌ Cette commande nécessite les droits administrateur.\n🍫🎻"
              });
              return;
            }

            // ─────────────────────────────
            // KICK / BAN
            // ─────────────────────────────

            if (
              command === "kick" ||
              command === "ban"
            ) {
              const target =
                getTargetJid(
                  message,
                  args
                );

              if (!target) {
                await sock.sendMessage(jid, {
                  text:
                    `❌ Mentionne quelqu'un.\nExemple : ${PREFIX}${command} @user\n🍫🎻`
                });
                return;
              }

              await sock.groupParticipantsUpdate(
                jid,
                [target],
                "remove"
              );

              await sock.sendMessage(jid, {
                text:
                  `🚫 @${jidToNumber(target)} a été retiré du groupe.\n🍫🎻`,
                mentions: [target]
              });

              return;
            }

            // ─────────────────────────────
            // ADD
            // ─────────────────────────────

            if (command === "add") {
              const number =
                args[0]?.replace(/\D/g, "");

              if (!number) {
                await sock.sendMessage(jid, {
                  text:
                    "❌ Exemple : .add 242XXXXXXXXX\n🍫🎻"
                });
                return;
              }

              const target =
                `${number}@s.whatsapp.net`;

              await sock.groupParticipantsUpdate(
                jid,
                [target],
                "add"
              );

              await sock.sendMessage(jid, {
                text:
                  `✅ @${number} ajouté au groupe.\n🍫🎻`,
                mentions: [target]
              });

              return;
            }

            // ─────────────────────────────
            // PROMOTE
            // ─────────────────────────────

            if (command === "promote") {
              const target =
                getTargetJid(
                  message,
                  args
                );

              if (!target) {
                await sock.sendMessage(jid, {
                  text:
                    "❌ Mentionne la personne à promouvoir.\n🍫🎻"
                });
                return;
              }

              await sock.groupParticipantsUpdate(
                jid,
                [target],
                "promote"
              );

              await sock.sendMessage(jid, {
                text:
                  `👑 @${jidToNumber(target)} est maintenant admin.\n🍫🎻`,
                mentions: [target]
              });

              return;
            }

            // ─────────────────────────────
            // DEMOTE
            // ─────────────────────────────

            if (command === "demote") {
              const target =
                getTargetJid(
                  message,
                  args
                );

              if (!target) {
                await sock.sendMessage(jid, {
                  text:
                    "❌ Mentionne l'admin à rétrograder.\n🍫🎻"
                });
                return;
              }

              await sock.groupParticipantsUpdate(
                jid,
                [target],
                "demote"
              );

              await sock.sendMessage(jid, {
                text:
                  `⬇️ @${jidToNumber(target)} n'est plus admin.\n🍫🎻`,
                mentions: [target]
              });

              return;
            }

            // ─────────────────────────────
            // LINK
            // ─────────────────────────────

            if (command === "link") {
              const code =
                await sock.groupInviteCode(jid);

              await sock.sendMessage(jid, {
                text:
                  `🔗 *LIEN DU GROUPE*\n\nhttps://chat.whatsapp.com/${code}\n\n🍫🎻`
              });

              return;
            }

            // ─────────────────────────────
            // REVOKE
            // ─────────────────────────────

            if (command === "revoke") {
              await sock.groupRevokeInvite(jid);

              await sock.sendMessage(jid, {
                text:
                  "🔐 L'ancien lien du groupe a été révoqué.\n🍫🎻"
              });

              return;
            }

            // ─────────────────────────────
            // GROUPNAME
            // ─────────────────────────────

            if (command === "groupname") {
              const newName =
                args.join(" ").trim();

              if (!newName) {
                await sock.sendMessage(jid, {
                  text:
                    "❌ Exemple : .groupname Nicolas Squad\n🍫🎻"
                });
                return;
              }

              await sock.groupUpdateSubject(
                jid,
                newName
              );

              await sock.sendMessage(jid, {
                text:
                  `✅ Nom changé en *${newName}*\n🍫🎻`
              });

              return;
            }

            // ─────────────────────────────
            // SETGDESC
            // ─────────────────────────────

            if (command === "setgdesc") {
              const description =
                args.join(" ").trim();

              if (!description) {
                await sock.sendMessage(jid, {
                  text:
                    "❌ Exemple : .setgdesc Bienvenue dans le groupe\n🍫🎻"
                });
                return;
              }

              await sock.groupUpdateDescription(
                jid,
                description
              );

              await sock.sendMessage(jid, {
                text:
                  "✅ Description du groupe modifiée.\n🍫🎻"
              });

              return;
            }

            // ─────────────────────────────
            // LEFT
            // ─────────────────────────────

            if (command === "left") {
              await sock.sendMessage(jid, {
                text:
                  "👋 Nicolas Ultra XMD quitte le groupe.\n🍫🎻"
              });

              await sleep(1000);

              await sock.groupLeave(jid);

              return;
            }
          }

          // ═══════════════════════════════
          // ❓ COMMANDE INCONNUE
          // ═══════════════════════════════

          await sock.sendMessage(jid, {
            text:
              `❓ Commande inconnue : *${PREFIX}${command}*\n\n` +
              `Utilise *${PREFIX}menu* pour voir les commandes.\n🍫🎻`
          });

        } catch (error) {
          console.error(
            "❌ ERREUR MESSAGE :",
            error
          );
        }
      }
    );

  } catch (error) {
    console.error("");
    console.error(
      "❌ ERREUR DÉMARRAGE :",
      error
    );

    isStarting = false;

    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        pairingRequested = false;
        startBot();
      }, 5000);
    }
  }
}

// ═══════════════════════════════════════
// 🚀 START
// ═══════════════════════════════════════

process.on("uncaughtException", error => {
  console.error(
    "❌ UNCAUGHT EXCEPTION :",
    error
  );
});

process.on("unhandledRejection", error => {
  console.error(
    "❌ UNHANDLED REJECTION :",
    error
  );
});

startBot();
