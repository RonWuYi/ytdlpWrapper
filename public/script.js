// const fs = require('fs');
const socket = io();

socket.on('connect', () => {
console.log('Connected with socket ID:', socket.id);
});

// Listen for messages from the server
socket.on('message', (msg) => {
alert(msg);
});

let socketId = null;

// socket.on('connect', () => {
//     socketId = socket.id;
//     console.log('Connected with socket ID:', socketId);
// });

// // Listen for messages from the server
// socket.on('message', (msg) => {
//     alert(msg);
// });
socket.on('downloadProgress', (data) => {
    updateProgressBar(data.progress);
});

socket.on('downloadComplete', (data) => {
    document.getElementById('message').textContent = data.message;
    document.getElementById('progress-container').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
});

socket.on('downloadError', (data) => {
    document.getElementById('message').textContent = data.message;
    document.getElementById('progress-container').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
});

socket.on('downloadCancelled', (data) => {
    document.getElementById('message').textContent = data.message;
    document.getElementById('progress-container').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
});

function downloadVideo(formatId) {
    const url = removeTimeParameter(document.getElementById('url').value);
    // url = removeTimeParameter(url);
    const messageElement = document.getElementById('message');
    const progressContainer = document.getElementById('progress-container');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (!url) {
        messageElement.textContent = 'Please enter a YouTube URL';
        return;
    }
    
    messageElement.textContent = 'Downloading...';
    progressContainer.style.display = 'block';
    cancelBtn.style.display = 'block';
    
    fetch('/download', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Socket-ID': socketId
        },
        body: JSON.stringify({ url, formatId }),
    })
    .then(response => response.text())
    .then(data => {
        messageElement.textContent = data;
    })
    .catch((error) => {
        console.error('Error:', error);
        messageElement.textContent = 'An error occurred while downloading';
    });
}

function cancelDownload() {
    console.log('Attempting to cancel download...');
    fetch('/cancel', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Socket-ID': socketId
        },
    })
    .then(response => response.text())
    .then(data => {
        console.log(data);
        document.getElementById('message').textContent = 'Download cancelled';
        document.getElementById('progress-container').style.display = 'none';
        document.getElementById('cancel-btn').style.display = 'none';
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function analyzeVideo() {
    const url = removeTimeParameter(document.getElementById('url').value);
    // url = removeTimeParameter(url);
    const messageElement = document.getElementById('message');
    const formatsContainer = document.getElementById('formats-container');
    const filterHighRes = document.getElementById('filterHighRes').checked;
    
    if (!url) {
        messageElement.textContent = 'Please enter a YouTube URL';
        return;
    }
    
    messageElement.textContent = 'Analyzing...';
    formatsContainer.innerHTML = '';
    
    // fetch('/analyze', {
    fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, filterHighRes }),
    })
    .then(response => response.json())
    .then(formats => {
        messageElement.textContent = 'Analysis complete. Click on a download button to start downloading.';
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Format ID</th>
                    <th>Extension</th>
                    <th>Resolution</th>
                    <th>FPS</th>
                    <th>File Size</th>
                    <th>Bitrate</th>
                    <th>Audio Codec</th>
                    <th>Video Codec</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        formats.forEach((format, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${format.format_id}</td>
                <td>${format.ext}</td>
                <td>${format.resolution}</td>
                <td>${format.fps}</td>
                <td>${format.filesize ? (format.filesize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</td>
                <td>${format.tbr ? format.tbr.toFixed(2) + ' kbps' : 'N/A'}</td>
                <td>${format.acodec}</td>
                <td>${format.vcodec}</td>
                <td><button class="download-btn" onclick="downloadVideo('${format.format_id}')">Download</button></td>
            `;
            
            if (index >= 10) {
                row.style.display = 'none';
            }
        });
        
        tableContainer.appendChild(table);
        formatsContainer.appendChild(tableContainer);
        
        let visibleRows = 10;
        const totalRows = formats.length;
        
        tableContainer.addEventListener('scroll', function() {
            if (this.scrollTop + this.clientHeight >= this.scrollHeight - 20) {
                const remainingRows = Math.min(10, totalRows - visibleRows);
                for (let i = visibleRows; i < visibleRows + remainingRows; i++) {
                    tbody.rows[i].style.display = '';
                }
                visibleRows += remainingRows;
            }
        });
    })
    .catch((error) => {
        console.error('Error:', error);
        messageElement.textContent = 'An error occurred while analyzing the video';
    });
}

function updateYtDlp() {
    const messageElement = document.getElementById('message');
    messageElement.textContent = 'Updating yt-dlp...';
    fetch('/update-ytdlp', {
        method: 'POST',
    })
    .then(response => response.text())
    .then(data => {
        messageElement.textContent = data;
    })
    .catch((error) => {
        console.error('Error:', error);
        messageElement.textContent = 'An error occurred while updating yt-dlp';
    });
}

function removeTimeParameter(url) {
    // Parse the URL
    let urlObj = new URL(url);
    
    // Get the search parameters
    let params = urlObj.searchParams;
    
    // Delete the 't' parameter
    params.delete('t');
    
    // Reconstruct the URL without the 't' parameter
    return urlObj.toString();
}

// // Function to download the latest yt-dlp.exe
// async function downloadLatestYtDlp() {
//     const releasesUrl = "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";
//     const response = await axios.get(releasesUrl);
//     const exeAsset = response.data.assets.find(asset => asset.name.endsWith('.exe'));

//     if (exeAsset) {
//         const writer = fs.createWriteStream(ytdlpPath);
//         const downloadResponse = await axios({
//             url: exeAsset.browser_download_url,
//             method: 'GET',
//             responseType: 'stream'
//         });
//         downloadResponse.data.pipe(writer);

//         return new Promise((resolve, reject) => {
//             writer.on('finish', resolve);
//             writer.on('error', reject);
//         });
//     } else {
//         throw new Error("No .exe file found in the latest release.");
//     }
// }

// // Check and download yt-dlp.exe if it doesn't exist
// if (!fs.existsSync(ytdlpPath)) {
//     downloadLatestYtDlp().catch(console.error);
// }

// function sayHello() {
//     alert("Hello, World!");
// }