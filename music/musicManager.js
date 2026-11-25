const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");
const {
    AudioPlayerStatus,
    StreamType,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    entersState
} = require("@discordjs/voice");
const play = require("play-dl");
const spotifyUrlInfo = require("spotify-url-info");
const ytSearch = require("yt-search");
const config = require("../config/music.json");

const queues = new Map();

const buttonLabels = {
    back: "⏪ 10s",
    pause: "⏸️ Pause",
    resume: "▶️ Resume",
    forward: "10s ⏩",
    skip: "⏭️ Skip",
    stop: "⏹️ Stop",
    queue: "📜 Queue",
    loop: "🔁 Loop",
    shuffle: "🔀 Shuffle",
    volumeDown: "🔉",
    volumeUp: "🔊"
};

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        const player = createAudioPlayer();
        const queue = {
            guildId,
            connection: null,
            player,
            tracks: [],
            current: null,
            volume: config.DEFAULT_VOLUME,
            loop: false,
            panelMessage: null,
            startedAt: 0,
            pausedAt: 0
        };

        player.on(AudioPlayerStatus.Idle, () => playNext(queue));
        player.on("error", error => {
            console.error("MUSIC PLAYER ERROR:", error);
            playNext(queue);
        });
        queues.set(guildId, queue);
    }
    return queues.get(guildId);
}

function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function progressBar(position, duration, size = 22) {
    if (!duration) return "🔘" + "─".repeat(size - 1);
    const index = Math.min(size - 1, Math.floor((position / duration) * size));
    return "▬".repeat(index) + "🔘" + "▬".repeat(Math.max(0, size - index - 1));
}

function currentPosition(queue) {
    if (!queue.current) return 0;
    if (queue.player.state.status === AudioPlayerStatus.Paused) return queue.pausedAt;
    return Math.min(queue.current.duration, (Date.now() - queue.startedAt) / 1000);
}

function buildPanel(queue) {
    const track = queue.current;
    const position = currentPosition(queue);
    const isPaused = queue.player.state.status === AudioPlayerStatus.Paused;
    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎵 GYRO RISHABH MUSIC")
        .setDescription(track
            ? `**Now Playing**\n[${track.title}](${track.url})\n\n${progressBar(position, track.duration)}\n${formatTime(position)} / ${formatTime(track.duration)}`
            : "Nothing is playing right now. Use `/play <song or URL>` to start music.")
        .addFields(
            { name: "🔊 Volume", value: `${queue.volume}%`, inline: true },
            { name: "🔁 Loop", value: queue.loop ? "On" : "Off", inline: true },
            { name: "📜 Queue", value: `${queue.tracks.length} track(s) waiting`, inline: true }
        )
        .setFooter({ text: "YouTube • SoundCloud • Spotify metadata search" });

    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("music:back").setLabel(buttonLabels.back).setStyle(ButtonStyle.Secondary).setDisabled(!track),
            new ButtonBuilder().setCustomId(isPaused ? "music:resume" : "music:pause").setLabel(isPaused ? buttonLabels.resume : buttonLabels.pause).setStyle(ButtonStyle.Primary).setDisabled(!track),
            new ButtonBuilder().setCustomId("music:forward").setLabel(buttonLabels.forward).setStyle(ButtonStyle.Secondary).setDisabled(!track),
            new ButtonBuilder().setCustomId("music:skip").setLabel(buttonLabels.skip).setStyle(ButtonStyle.Success).setDisabled(!track),
            new ButtonBuilder().setCustomId("music:stop").setLabel(buttonLabels.stop).setStyle(ButtonStyle.Danger).setDisabled(!track)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("music:queue").setLabel(buttonLabels.queue).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("music:loop").setLabel(buttonLabels.loop).setStyle(queue.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("music:shuffle").setLabel(buttonLabels.shuffle).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("music:volumeDown").setLabel(buttonLabels.volumeDown).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("music:volumeUp").setLabel(buttonLabels.volumeUp).setStyle(ButtonStyle.Secondary)
        )
    ];

    return { embeds: [embed], components: rows };
}

async function updatePanel(queue) {
    if (!queue.panelMessage) return;
    await queue.panelMessage.edit(buildPanel(queue)).catch(() => null);
}

function normalizeTrack(result, requester) {
    return {
        title: result.title,
        url: result.url,
        duration: Number(result.durationInSec || result.duration || 0),
        thumbnail: result.thumbnail?.url || result.thumbnail,
        requester
    };
}

async function resolveQuery(query, requester) {
    const cleanQuery = typeof query === "string" ? query.trim() : "";
    if (!cleanQuery) throw new Error("Enter a song name or a valid YouTube, SoundCloud or Spotify URL.");

    const isUrl = /^https?:\/\//i.test(cleanQuery);
    let searchQuery = cleanQuery;

    if (isUrl && /spotify\.com/i.test(cleanQuery)) {
        try {
            const data = await spotifyUrlInfo.getData(cleanQuery);
            const artist = data.artists?.map(artist => artist.name).join(", ") || data.artist || "";
            searchQuery = `${data.name || data.title || ""} ${artist}`.trim();
        } catch (error) {
            console.warn("SPOTIFY METADATA ERROR:", error.message);
        }
    }

    if (isUrl && !/spotify\.com/i.test(cleanQuery)) {
        const info = await play.video_info(cleanQuery).catch(() => null);
        if (info?.video_details) {
            return normalizeTrack({
                title: info.video_details.title,
                url: cleanQuery,
                durationInSec: info.video_details.durationInSec,
                thumbnail: info.video_details.thumbnails?.[0]?.url
            }, requester);
        }
    }

    const results = await play.search(searchQuery, { limit: 1, source: { youtube: "video" } });
    if (!results.length) throw new Error("No playable track found.");
    return normalizeTrack(results[0], requester);
}

async function connectToVoice(interaction, queue) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) throw new Error("Join a voice channel first.");
    if (voiceChannel.id !== config.MUSIC_VOICE_CHANNEL_ID) {
        throw new Error(`Join <#${config.MUSIC_VOICE_CHANNEL_ID}> to use the music player.`);
    }

    queue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true
    });
    await entersState(queue.connection, VoiceConnectionStatus.Ready, 20_000);
    queue.connection.subscribe(queue.player);
}

async function createStream(track, position = 0) {
    const stream = await play.stream(track.url, {
        quality: 2,
        discordPlayerCompatibility: true,
        seek: Math.max(0, position)
    });
    return createAudioResource(stream.stream, {
        inputType: stream.type || StreamType.Arbitrary,
        inlineVolume: true
    });
}

async function playNext(queue, fromPosition = 0) {
    if (!queue.current && queue.tracks.length === 0) {
        await updatePanel(queue);
        return;
    }

    if (!(queue.current && queue.loop && fromPosition === 0)) {
        queue.current = queue.tracks.shift() || null;
    }

    if (!queue.current) return;

    try {
        const resource = await createStream(queue.current, fromPosition);
        resource.volume?.setVolume(queue.volume / 100);
        queue.startedAt = Date.now() - fromPosition * 1000;
        queue.pausedAt = fromPosition;
        queue.player.play(resource);
        await updatePanel(queue);
    } catch (error) {
        console.error("MUSIC STREAM ERROR:", error);
        queue.current = null;
        await playNext(queue);
    }
}

async function start(query, interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue.connection) await connectToVoice(interaction, queue);

    const track = await resolveQuery(query, interaction.user.tag);
    queue.tracks.push(track);
    if (!queue.current) await playNext(queue);

    const channel = interaction.channel;
    if (!queue.panelMessage || queue.panelMessage.channelId !== channel.id) {
        queue.panelMessage = await channel.send(buildPanel(queue));
    } else {
        await updatePanel(queue);
    }

    return queue;
}

async function handleButton(interaction) {
    const queue = queues.get(interaction.guildId);
    if (!queue) return interaction.reply({ content: "❌ No music queue is active.", ephemeral: true });

    switch (interaction.customId) {
        case "music:pause":
            queue.pausedAt = currentPosition(queue);
            queue.player.pause();
            break;
        case "music:resume":
            queue.startedAt = Date.now() - queue.pausedAt * 1000;
            queue.player.unpause();
            break;
        case "music:skip":
            queue.loop = false;
            queue.current = null;
            queue.player.stop(true);
            break;
        case "music:stop":
            queue.tracks = [];
            queue.current = null;
            queue.player.stop(true);
            queue.connection?.destroy();
            queue.connection = null;
            break;
        case "music:back":
        case "music:forward": {
            if (!queue.current) break;
            const step = config.SEEK_STEP_SECONDS * (interaction.customId === "music:back" ? -1 : 1);
            const position = Math.max(0, Math.min(queue.current.duration, currentPosition(queue) + step));
            const resource = await createStream(queue.current, position);
            resource.volume?.setVolume(queue.volume / 100);
            queue.startedAt = Date.now() - position * 1000;
            queue.pausedAt = position;
            queue.player.play(resource);
            break;
        }
        case "music:loop":
            queue.loop = !queue.loop;
            break;
        case "music:shuffle":
            queue.tracks.sort(() => Math.random() - 0.5);
            break;
        case "music:volumeDown":
            queue.volume = Math.max(0, queue.volume - 10);
            break;
        case "music:volumeUp":
            queue.volume = Math.min(100, queue.volume + 10);
            break;
        case "music:queue": {
            const list = queue.tracks.length
                ? queue.tracks.map((track, index) => `${index + 1}. ${track.title}`).join("\n")
                : "Queue is empty.";
            return interaction.reply({ content: `📜 **Queue**\n${list}`, ephemeral: true });
        }
        default:
            return interaction.reply({ content: "❌ Unknown music control.", ephemeral: true });
    }

    await interaction.update(buildPanel(queue));
}

module.exports = {
    start,
    handleButton,
    buildPanel,
    getQueue
};
