let isFetching = false;
let currentData = [];

async function fetchHtmlContent(pubhtmlUrl) {
    // Add a timestamp to the URL to prevent caching
    const urlWithTimestamp = `${pubhtmlUrl}?t=${new Date().getTime()}`;
    const response = await fetch(urlWithTimestamp);
    const html = await response.text();
    return html;
}

function parseHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tr');
    
    const data = Array.from(rows).slice(1).map(row => {
        const cells = row.querySelectorAll('td');
        return {
            timestamp: cells[0]?.innerText.trim() || '',
            message: cells[1]?.innerText.trim() || '',
            signature: cells[2]?.innerText.trim() || ''
        };
    });

    return data;
}

function displayMessages(data) {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = ''; // Clear existing messages
    data.forEach((entry, index) => {
        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        chatBubble.id = `message-${index + 1}`;  // Add unique ID
        
        const chatTimestamp = document.createElement('div');
        chatTimestamp.className = 'timestamp';
        chatTimestamp.textContent = entry.timestamp;

        const chatMessage = document.createElement('div');
        chatMessage.className = 'message';
        chatMessage.textContent = entry.message;

        const chatSignature = document.createElement('div');
        chatSignature.className = 'signature';
        chatSignature.textContent = `- ${entry.signature}`;

        // Create share button
        const shareButton = document.createElement('button');
        shareButton.className = 'share-button';
        shareButton.innerHTML = '🔗';
        shareButton.addEventListener('click', () => shareChatBubble(chatBubble, index + 1));

        chatBubble.appendChild(chatTimestamp);
        chatBubble.appendChild(chatMessage);
        chatBubble.appendChild(chatSignature);
        chatBubble.appendChild(shareButton);
        
        chatContainer.appendChild(chatBubble);
    });
}


async function fetchDataAndUpdate() {
    if (isFetching) return;
    isFetching = true;

    try {
        const pubhtmlUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQazrkD8DxsLDMhQ4X78vjlIjq1wos7C-0dge7NDG0EBkJ7jhePsJYXCGUvMV79GaNcAa1hJYS_M-5Z/pubhtml';
        const html = await fetchHtmlContent(pubhtmlUrl);
        const newData = parseHtml(html);
        
        // Update the display only if new data is different
        if (JSON.stringify(newData) !== JSON.stringify(currentData)) {
            currentData = newData;
            displayMessages(newData);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isFetching = false;
    }
}

// Fetch data initially
fetchDataAndUpdate();

// Set interval to refresh data every 10 seconds (10000 milliseconds)
setInterval(fetchDataAndUpdate, 10000);

// Toggle form visibility
document.getElementById('toggleFormButton').addEventListener('click', () => {
    const formContainer = document.getElementById('formContainer');
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        document.getElementById('toggleFormButton').textContent = 'Close Form';
    } else {
        formContainer.classList.add('hidden');
        document.getElementById('toggleFormButton').textContent = 'Open Form';
    }
});

// Add scroll event
document.getElementById('scrollToBottomButton').addEventListener('click', () => {
    document.getElementById('bottom-of-page').scrollIntoView({ behavior: 'smooth' });
});

// Function to share chat bubble
async function shareChatBubble(chatBubble, referenceNumber) {
    const canvas = await html2canvas(chatBubble);
    const imgData = canvas.toDataURL("image/png");

    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = imgData;
    downloadLink.download = `message-${referenceNumber}.png`;
    downloadLink.textContent = "Download Screenshot";

    // Create share link
    const shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href + '#message-' + referenceNumber)}&text=Check out this message!`;

    const link = document.createElement('a');
    link.href = shareLink;
    link.target = '_blank';
    link.textContent = "Share on Twitter";

    // Display options
    const optionsContainer = document.createElement('div');
    optionsContainer.appendChild(downloadLink);
    optionsContainer.appendChild(link);

    // Append options below chat bubble
    chatBubble.appendChild(optionsContainer);
}


