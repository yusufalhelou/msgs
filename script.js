let isFetching = false;
let currentData = [];

// Function to scroll to the specific message
function scrollToMessage() {
    const hash = window.location.hash.substring(1); // Get the hash without the #
    if (hash) {
        const messageElement = document.getElementById(`message-${hash}`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

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
        const chatWrapper = document.createElement('div');
        chatWrapper.className = 'chat-wrapper';  // Add wrapper for styling

        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        const messageId = `${index + 1}`; // Numeric ID
        chatBubble.id = `message-${messageId}`;
        
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
        shareButton.addEventListener('click', () => shareChatBubble(chatWrapper, messageId));

        chatBubble.appendChild(chatTimestamp);
        chatBubble.appendChild(chatMessage);
        chatBubble.appendChild(chatSignature);
        
        chatWrapper.appendChild(chatBubble);
        chatWrapper.appendChild(shareButton);  // Place share button next to the chat bubble
        chatContainer.appendChild(chatWrapper);
    });

    // Scroll to the message if URL hash is present
    scrollToMessage();
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
async function shareChatBubble(chatWrapper, messageId) {
    const shareButton = chatWrapper.querySelector('.share-button');
    shareButton.style.display = 'none';  // Hide share button

    // Check if options already exist, remove them if they do
    const existingOptions = chatWrapper.querySelector('.share-options');
    if (existingOptions) {
        chatWrapper.removeChild(existingOptions);
        shareButton.style.display = 'block';
        return;
    }

    // Capture screenshot
    const canvas = await html2canvas(chatWrapper);
    const imgData = canvas.toDataURL("image/png");

    shareButton.style.display = 'block';  // Show share button again

    const urlWithoutHash = window.location.href.split('#')[0];
    const shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(urlWithoutHash + '#' + messageId)}&text=Check out this message!`;
    
    // Create download and share links
    const downloadLink = document.createElement('a');
    downloadLink.href = imgData;
    downloadLink.download = `message-${messageId}.png`;
    downloadLink.textContent = "Download Screenshot";

    const link = document.createElement('a');
    link.href = shareLink;
    link.target = '_blank';
    link.textContent = "Share on Twitter";

    // Display options
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'share-options';  // Add class for styling
    optionsContainer.appendChild(downloadLink);
    optionsContainer.appendChild(link);

    chatWrapper.appendChild(optionsContainer);
}
