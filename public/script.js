// const fs = require('fs');
const socket = io();

let socketId = null;

socket.on('connect', () => {
    socketId = socket.id;
    console.log('Connected with socket ID:', socket.id);
});

let notificationTimeout;

socket.on('message', (msg) => {
    showNotification(msg);
});

function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.opacity = '1';

    // Clear any existing timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    // Set a new timeout to hide the notification
    notificationTimeout = setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500); // Wait for fade out animation to complete
    }, duration);
}

// Listen for messages from the server
// socket.on('message', (msg) => {
//     alert(msg);
// });

function updateProgressBar(progress) {
    const progressBar = document.querySelector('.progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;
}

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

const DOWNLOAD_HISTORY_KEY = 'youtube_download_history';

// Function to save a downloaded link
function saveDownloadedLink(url) {
    let history = getDownloadHistory();
    if (!history.includes(url)) {
        history.push(url);
        localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(history));
    }
}

// Function to get the download history
function getDownloadHistory() {
    const history = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
}

// Function to check if a link has been downloaded
function isLinkDownloaded(url) {
    return getDownloadHistory().includes(url);
}

// Function to clear the download history
function clearDownloadHistory() {
    localStorage.removeItem(DOWNLOAD_HISTORY_KEY);
}

/* work version
function downloadVideo(formatId) {
    const url = document.getElementById('url').value;
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
        console.log(data); // Log the response from the server
        messageElement.textContent = data;
    })
    .catch((error) => {
        console.error('Error:', error);
        messageElement.textContent = 'An error occurred while downloading';
    });
}
    work version end
*/ 

function downloadVideo(formatId) {
    const url = document.getElementById('url').value;
    const messageElement = document.getElementById('message');
    const progressContainer = document.getElementById('progress-container');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (!url) {
        messageElement.textContent = 'Please enter a YouTube URL';
        return;
    }
    
    if (isLinkDownloaded(url)) {
        if (!confirm('This video has been downloaded before. Do you want to download it again?')) {
            return;
        }
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
        console.log(data); // Log the response from the server
        saveDownloadedLink(url); // Save the URL to download history
    })
    .catch((error) => {
        console.error('Error:', error);
        messageElement.textContent = 'An error occurred while downloading';
    });
}

function displayDownloadHistory() {
    const history = getDownloadHistory();
    const historyElement = document.getElementById('download-history');
    historyElement.innerHTML = '<h3>Download History</h3>';
    if (history.length === 0) {
        historyElement.innerHTML += '<p>No downloads yet.</p>';
    } else {
        const ul = document.createElement('ul');
        history.forEach(url => {
            const li = document.createElement('li');
            li.textContent = url;
            ul.appendChild(li);
        });
        historyElement.appendChild(ul);
    }
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
    // const url = document.getElementById('url').value;
    // const messageElement = document.getElementById('message');
    // const formatsContainer = document.getElementById('formats-container');
    // const filterHighRes = document.getElementById('filterHighRes').checked;
    
    // if (!url) {
    //     messageElement.textContent = 'Please enter a YouTube URL';
    //     return;
    // }
    
    // messageElement.textContent = 'Analyzing...';
    // formatsContainer.innerHTML = '';
    
    // // fetch('/analyze', {
    // fetch('/analyze', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ url, filterHighRes }),
    // })
    // .then(response => response.json())
    // .then(formats => {
    //     messageElement.textContent = 'Analysis complete. Click on a download button to start downloading.';
        
    //     const tableContainer = document.createElement('div');
    //     tableContainer.className = 'table-container';
    const url = document.getElementById('url').value;
    const messageElement = document.getElementById('message');
    const formatsContainer = document.getElementById('formats-container');
    const filterHighRes = document.getElementById('filterHighRes').checked;
    
    if (!url) {
        messageElement.textContent = 'Please enter a YouTube URL';
        return;
    }
    
    messageElement.textContent = 'Analyzing...';
    formatsContainer.innerHTML = '';
    
    fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, filterHighRes }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            messageElement.textContent = data.error;
            return;
        }

        const { formats, cleanUrl } = data;
        messageElement.textContent = 'Analysis complete. Click on a download button to start downloading.';
        
        // Update the URL input with the cleaned URL
        document.getElementById('url').value = cleanUrl;

        // const tableContainer = document.createElement('div');
        // tableContainer.className = 'table-container';
        
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
            
            // if (index >= 5) {
            //     row.style.display = 'none';
            // }
        });
        
        // tableContainer.appendChild(table);
        // formatsContainer.appendChild(tableContainer);
        
        // let visibleRows = 5;
        // const totalRows = formats.length;
        
        // tableContainer.addEventListener('scroll', function() {
        //     if (this.scrollTop + this.clientHeight >= this.scrollHeight - 20) {
        //         const remainingRows = Math.min(5, totalRows - visibleRows);
        //         for (let i = visibleRows; i < visibleRows + remainingRows; i++) {
        //             tbody.rows[i].style.display = '';
        //         }
        //         visibleRows += remainingRows;
        //     }
        // });
        formatsContainer.appendChild(table);
        
        // Adjust table container height based on number of rows
        const tableContainer = document.querySelector('.table-container');
        const rowHeight = 37; // Approximate height of a row in pixels
        const headerHeight = 37; // Height of the header row
        const maxVisibleRows = 5;
        
        if (formats.length > maxVisibleRows) {
            tableContainer.style.height = `${(maxVisibleRows * rowHeight) + headerHeight}px`;
        } else {
            tableContainer.style.height = `${(formats.length * rowHeight) + headerHeight}px`;
        }
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

// function removeTimeParameter(url) {
//     // Parse the URL
//     let urlObj = new URL(url);
    
//     // Get the search parameters
//     let params = urlObj.searchParams;
    
//     // Delete the 't' parameter
//     params.delete('t');
    
//     // Reconstruct the URL without the 't' parameter
//     return urlObj.toString();
// }



// function sayHello() {
//     alert("Hello, World!");
// }