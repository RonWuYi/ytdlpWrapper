const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const axios = require('axios'); // Add this line

const { exec } = require('child_process');
// const { Server } = require("socket.io");
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// let activeDownloads = null;
const activeDownloads = new Map();

app.use(express.static('public')); // 'public' is the directory name where your files are located
app.use(express.json());

// Serve your HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected with socket ID:', socket.id);

  // Example of sending a message to the client
  socket.emit('message', 'Hello from server');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
  console.log(`Server running at http://localhost:${PORT}`);
});

const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');

// Function to download the latest yt-dlp.exe
async function downloadLatestYtDlp() {
    const releasesUrl = "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";
    const response = await axios.get(releasesUrl);
    const exeAsset = response.data.assets.find(asset => asset.name.endsWith('.exe'));

    if (exeAsset) {
        const writer = fs.createWriteStream(ytdlpPath);
        const downloadResponse = await axios({
            url: exeAsset.browser_download_url,
            method: 'GET',
            responseType: 'stream'
        });
        downloadResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } else {
        throw new Error("No .exe file found in the latest release.");
    }
}

// Check and download yt-dlp.exe if it doesn't exist
if (!fs.existsSync(ytdlpPath)) {
    console.log("yt-dlp.exe not found. Downloading the latest version...");
    downloadLatestYtDlp()
        .then(() => console.log("yt-dlp.exe downloaded successfully."))
        .catch(error => console.error("Error downloading yt-dlp.exe:", error));
}


const url = require('url');

// Helper function to validate and clean YouTube URL
function validateAndCleanYouTubeUrl(inputUrl) {
    try {
        const parsedUrl = new URL(inputUrl);
        const hostname = parsedUrl.hostname;

        // Check if it's a YouTube URL
        if (!['youtube.com', 'www.youtube.com', 'youtu.be'].includes(hostname)) {
            return { isValid: false, message: 'Not a valid YouTube URL' };
        }

        // Remove timestamp
        parsedUrl.searchParams.delete('t');

        // For short URLs (youtu.be), convert to full youtube.com URL
        if (hostname === 'youtu.be') {
            const videoId = parsedUrl.pathname.slice(1);
            return { 
                isValid: true, 
                cleanUrl: `https://www.youtube.com/watch?v=${videoId}` 
            };
        }

        return { isValid: true, cleanUrl: parsedUrl.toString() };
    } catch (error) {
        return { isValid: false, message: 'Invalid URL format' };
    }
}

app.post('/analyze', (req, res) => {
    const { url, filterHighRes } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const urlValidation = validateAndCleanYouTubeUrl(url);
    if (!urlValidation.isValid) {
        return res.status(400).json({ error: urlValidation.message });
    }

    const cleanUrl = urlValidation.cleanUrl;
    
    exec(`"${ytdlpPath}" -J ${cleanUrl}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Error analyzing video' });
        }
        try {
            const videoInfo = JSON.parse(stdout);
            let formats = videoInfo.formats;
            if (filterHighRes) {
                formats = formats.filter(format => {
                    const [width, height] = (format.resolution || '').split('x').map(Number);
                    return width >= 1920 && height >= 1080;
                });
            }
            formats = formats.map(format => ({
                format_id: format.format_id,
                ext: format.ext,
                resolution: format.resolution,
                fps: format.fps,
                filesize: format.filesize,
                tbr: format.tbr,
                acodec: format.acodec,
                vcodec: format.vcodec
            }));
            res.json({ formats, cleanUrl });
        } catch (parseError) {
            console.error(`Parse error: ${parseError}`);
            res.status(500).json({ error: 'Error parsing video information' });
        }
    });
});

// // Check and download yt-dlp.exe if it doesn't exist
// if (!fs.existsSync(ytdlpPath)) {
//     downloadLatestYtDlp().catch(console.error);
// }

// // ... rest of your server-side code ...
// app.post('/analyze', (req, res) => {
//     const { url, filterHighRes } = req.body;
//     if (!url) {
//         return res.status(400).send('URL is required');
//     }
    
//     exec(`${ytdlpPath} -J ${url}`, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`exec error: ${error}`);
//             return res.status(500).send('Error analyzing video');
//         }
//         try {
//             const videoInfo = JSON.parse(stdout);
//             let formats = videoInfo.formats;
//             if (filterHighRes) {
//                 formats = formats.filter(format => {
//                     const [width, height] = (format.resolution || '').split('x').map(Number);
//                     return width >= 1920 && height >= 1080;
//                 });
//             }
//             formats = formats.map(format => ({
//                 format_id: format.format_id,
//                 ext: format.ext,
//                 resolution: format.resolution,
//                 fps: format.fps,
//                 filesize: format.filesize,
//                 tbr: format.tbr,
//                 acodec: format.acodec,
//                 vcodec: format.vcodec
//             }));
//             res.json(formats);
//         } catch (parseError) {
//             console.error(`Parse error: ${parseError}`);
//             res.status(500).send('Error parsing video information');
//         }
//     });
// });

/* not work version

// app.post('/download', (req, res) => {
//     // const { url, formatId } = req.body;
//     // const socketId = req.headers['x-socket-id'];
    
//     // if (!url || !formatId) {
//     //     return res.status(400).send('URL and format ID are required');
//     // }

//     // const ytdlp = spawn(ytdlpPath, ['-f', formatId, url]);
//     // activeDownloads.set(socketId, { process: ytdlp });
//     const { url, formatId } = req.body;
//     const socketId = req.headers['x-socket-id'];

//     if (!url || !formatId || !socketId) {
//         return res.status(400).send('URL, format ID, and socket ID are required');
//     }

//     const tempFilePath = path.join(__dirname, 'temp', `${socketId}.part`);
//     const command = `${ytdlpPath} -f ${formatId} ${url} -o ${tempFilePath}`;

//     const ytdlp = exec(command, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`exec error: ${error}`);
//             if (!res.headersSent) {
//                 return res.status(500).send('Error downloading video');
//             }
//             // return res.status(500).send('Error downloading video');
//         } else {
//             if (!res.headersSent) {
//                 // return res.status(500).send('Error downloading video');
//                 res.send('Video downloaded successfully');

//             }
//         }
//         // res.send('Video downloaded successfully');
//     });

//     // Store the process and temp file path
//     activeDownloads.set(socketId, { process: ytdlp, tempFilePath });

//     ytdlp.stdout.on('data', (data) => {
//         const output = data.toString();
//         const progressMatch = output.match(/(\d+\.\d+)%/);
//         if (progressMatch) {
//             const progress = parseFloat(progressMatch[1]);
//             io.to(socketId).emit('downloadProgress', { progress });
//         }
//     });

//     ytdlp.on('close', (code) => {
//         activeDownloads.delete(socketId);
//         if (code === 0) {
//             io.to(socketId).emit('downloadComplete', { message: 'Download completed successfully' });
//         } else {
//             io.to(socketId).emit('downloadError', { message: 'Error occurred during download' });
//         }
//     });

//     res.send('Download started');
// });

// const treeKill = require('tree-kill');

// app.post('/cancel', (req, res) => {
//     const socketId = req.headers['x-socket-id'];
//     console.log('Received cancel request for socket ID:', socketId);
//     const download = activeDownloads.get(socketId);
//     if (download) {
//         const { process, tempFilePath } = download;
//         console.log('Found active download, attempting to kill process...');
//         treeKill(download.process.pid, 'SIGKILL', (err) => {
//             if (err) {
//                 console.error('Error killing process:', err);
//                 res.status(500).send('Error cancelling download');
//             } else {
//                 console.log('Process killed successfully');
//                 // Delete the temporary file
//                 if (fs.existsSync(tempFilePath)) {
//                     fs.unlinkSync(tempFilePath);
//                 }
//                 activeDownloads.delete(socketId);
//                 io.to(socketId).emit('downloadCancelled', { message: 'Download cancelled' });
//                 console.log('Download cancelled successfully');
//                 res.send('Download cancelled');
//             }
//         });
//     } else {
//         console.log('No active download found for this socket ID');
//         res.status(404).send('No active download found');
//     }
// });
/* not work version end here */

// /* work version

app.post('/download', (req, res) => {
    const { url, formatId } = req.body;
    const socketId = req.headers['x-socket-id'];
    
    if (!url || !formatId) {
        return res.status(400).send('URL and format ID are required');
    }

    const ytdlp = spawn(ytdlpPath, ['-f', formatId, url]);
    activeDownloads.set(socketId, { process: ytdlp });

    ytdlp.stdout.on('data', (data) => {
        const output = data.toString();
        const progressMatch = output.match(/(\d+\.\d+)%/);
        if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            io.to(socketId).emit('downloadProgress', { progress });
        }
    });

    ytdlp.on('close', (code) => {
        activeDownloads.delete(socketId);
        if (code === 0) {
            io.to(socketId).emit('downloadComplete', { message: 'Download completed successfully' });
        } else {
            io.to(socketId).emit('downloadError', { message: 'Error occurred during download' });
        }
    });

    res.send('Download started');
});

const treeKill = require('tree-kill');

app.post('/cancel', (req, res) => {
    const socketId = req.headers['x-socket-id'];
    console.log('Received cancel request for socket ID:', socketId);
    const download = activeDownloads.get(socketId);
    if (download) {
        console.log('Found active download, attempting to kill process...');
        treeKill(download.process.pid, 'SIGKILL', (err) => {
            if (err) {
                console.error('Error killing process:', err);
                res.status(500).send('Error cancelling download');
            } else {
                activeDownloads.delete(socketId);
                io.to(socketId).emit('downloadCancelled', { message: 'Download cancelled' });
                console.log('Download cancelled successfully');
                res.send('Download cancelled');
            }
        });
    } else {
        console.log('No active download found for this socket ID');
        res.status(404).send('No active download found');
    }
});

// work version end here
// */

// app.post('/cancel', (req, res) => {
//     const socketId = req.headers['x-socket-id'];
//     console.log('Received cancel request for socket ID:', socketId);
//     const download = activeDownloads.get(socketId);
//     if (download) {
//         // download.process.kill('SIGINT');
//         download.process.kill('SIGTERM');
//         activeDownloads.delete(socketId);
//         io.to(socketId).emit('downloadCancelled', { message: 'Download cancelled' });
//         console.log('Download cancelled successfully');
//         res.send('Download cancelled');
//     } else {
//         console.log('No active download found for this socket ID');
//         res.status(404).send('No active download found');
//     }
// });

// Add this new route to handle the update request
app.post('/update-ytdlp', (req, res) => {
    exec(`${ytdlpPath} -U`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Error updating yt-dlp');
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        res.send('yt-dlp updated successfully');
    });
});