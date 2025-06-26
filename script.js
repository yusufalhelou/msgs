// Base64 Image Converter (Run once on load)
let base64Signature; // Global variable to store the result

async function prepareSignature() {
    const imgUrl = 'https://raw.githubusercontent.com/51PharmD/msgs/refs/heads/main/YusufAlhelou.png';
    try {
        const response = await fetch(imgUrl);
        const blob = await response.blob();
        base64Signature = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Failed to load signature:", error);
    }
}

// Initialize when page loads
prepareSignature();

let isFetching = false;
let currentData = [];
let isPollingActive = false;
let pollingInterval = null;
let currentFilter = 'all';

// Improved scrollToMessage with reply expansion
function scrollToMessage() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const messageElement = document.getElementById(`message-${hash}`);
    if (messageElement) {
        // Expand any collapsed replies
        const repliesContainer = messageElement.querySelector('.replies-container');
        if (repliesContainer) {
            repliesContainer.classList.add('visible');
            const toggleIcon = messageElement.querySelector('.reply-toggle');
            if (toggleIcon) toggleIcon.textContent = '▲';
        }

        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight');
        
        setTimeout(() => {
            messageElement.classList.remove('highlight');
        }, 2000);
    }
}

async function fetchHtmlContent(pubhtmlUrl) {
    const urlWithTimestamp = `${pubhtmlUrl}?t=${new Date().getTime()}`;
    const response = await fetch(urlWithTimestamp);
    return await response.text();
}

function parseHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tr');
    
    return Array.from(rows).slice(1).map(row => {
        const cells = row.querySelectorAll('td');
        return {
            timestamp: cells[0]?.innerText.trim() || '',
            message: cells[1]?.innerText.trim() || '',
            signature: cells[2]?.innerText.trim() || '',
            tag: cells[3]?.innerText.trim() || ''
        };
    });
}

function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function extractMessageIdFromText(text) {
    const urlMatch = text.match(/https?:\/\/51pharmd\.github\.io\/msgs\/#(\d+)/i);
    return urlMatch ? urlMatch[1] : null;
}

function groupReplies(messages) {
    const replyMap = {};
    messages.forEach((msg, index) => {
        const replyToId = extractMessageIdFromText(msg.message);
        if (replyToId) {
            if (!replyMap[replyToId]) replyMap[replyToId] = [];
            replyMap[replyToId].push(index);
        }
    });
    return replyMap;
}

function filterMessages(data) {
    switch(currentFilter) {
        case 'all': return data;
        case 'pinned': return data.filter(entry => entry.tag?.includes('📌'));
        case 'latest': return data.slice(-5).reverse();
        default: return data;
    }
}

function createReplyToggle(replyCount) {
    const toggle = document.createElement('span');
    toggle.className = 'reply-toggle';
    toggle.textContent = '▼';
    return toggle;
}

function createReplyBadge(replyCount) {
    const badge = document.createElement('span');
    badge.className = 'reply-badge';
    badge.textContent = `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
    return badge;
}

function createRepliesContainer() {
    const container = document.createElement('div');
    container.className = 'replies-container';
    return container;
}

function displayMessages(data) {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = '';
    
    const filteredData = filterMessages(data);
    const replyMap = groupReplies(filteredData);
    const pinnedCount = data.filter(entry => entry.tag?.includes('📌')).length;

    // Update pinned button if exists
    const pinnedButton = document.querySelector('[data-filter="pinned"]');
    if (pinnedButton) {
        pinnedButton.textContent = pinnedCount > 0 ? `Pinned 📌 [${pinnedCount}]` : 'Pinned 📌';
    }

    // First pass: Create all message elements
    const messageElements = filteredData.map((entry, index) => {
        const messageId = index + 1;
        const chatWrapper = document.createElement('div');
        chatWrapper.className = 'chat-wrapper';

        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        chatBubble.id = `message-${messageId}`;

        // Pin indicator
        if (entry.tag?.includes('📌')) {
            const pin = document.createElement('div');
            pin.className = 'pin-indicator';
            pin.textContent = '📌';
            chatBubble.appendChild(pin);
        }

        // Message decorations
        const wire = document.createElement('div');
        wire.className = 'wire';
        chatBubble.appendChild(wire);

        const lightsContainer = document.createElement('div');
        lightsContainer.className = 'lights';
        for (let i = 0; i < 8; i++) {
            const light = document.createElement('div');
            light.className = 'light';
            lightsContainer.appendChild(light);
        }
        chatBubble.appendChild(lightsContainer);

        // Message content
        const chatTimestamp = document.createElement('div');
        chatTimestamp.className = 'timestamp';
        chatTimestamp.textContent = entry.timestamp;

        const chatMessage = document.createElement('div');
        chatMessage.className = 'message';
        chatMessage.innerHTML = linkify(entry.message);

        const chatSignature = document.createElement('div');
        chatSignature.className = 'signature';
        chatSignature.textContent = `- ${entry.signature}`;

        // Add reply link if this is a reply
        const replyToId = extractMessageIdFromText(entry.message);
        if (replyToId) {
            const replyLink = document.createElement('a');
            replyLink.className = 'reply-link';
            replyLink.textContent = '↩ Replying to #' + replyToId;
            replyLink.href = `#${replyToId}`;
            replyLink.onclick = (e) => {
                e.preventDefault();
                window.location.hash = replyToId;
                scrollToMessage();
            };
            chatMessage.appendChild(document.createElement('br'));
            chatMessage.appendChild(replyLink);
        }

        // Signature image
        if (entry.tag?.includes('⚡') && base64Signature) {
            const signatureImg = document.createElement('img');
            signatureImg.src = base64Signature;
            signatureImg.className = 'signature-image';
            signatureImg.style.display = 'block';
            signatureImg.alt = 'Yusuf Alhelou';
            chatBubble.appendChild(signatureImg);
        }

        // Share button
        const shareButton = document.createElement('button');
        shareButton.className = 'share-button';
        shareButton.innerHTML = '🔗';
        shareButton.addEventListener('click', () => shareChatBubble(chatWrapper, messageId));

        // Assemble message
        chatBubble.appendChild(chatTimestamp);
        chatBubble.appendChild(chatMessage);
        chatBubble.appendChild(chatSignature);
        chatWrapper.appendChild(chatBubble);
        chatWrapper.appendChild(shareButton);

        return { element: chatWrapper, id: messageId };
    });

    // Second pass: Organize replies into threads
    messageElements.forEach(({ element, id }) => {
        if (replyMap[id]?.length) {
            const repliesContainer = createRepliesContainer();
            const replyIndicator = document.createElement('div');
            replyIndicator.className = 'reply-indicator';
            
            replyIndicator.appendChild(createReplyBadge(replyMap[id].length));
            replyIndicator.appendChild(createReplyToggle(replyMap[id].length));
            
            replyIndicator.addEventListener('click', () => {
                repliesContainer.classList.toggle('visible');
                const toggle = replyIndicator.querySelector('.reply-toggle');
                toggle.textContent = repliesContainer.classList.contains('visible') ? '▲' : '▼';
            });

            // Add replies to container
            replyMap[id].forEach(replyIndex => {
                repliesContainer.appendChild(messageElements[replyIndex].element);
            });

            // Add to message
            element.querySelector('.signature').appendChild(replyIndicator);
            element.appendChild(repliesContainer);
        }
        
        chatContainer.appendChild(element);
    });

    scrollToMessage();
}


async function fetchDataAndUpdate() {
    if (isFetching || !isPollingActive) return;
    isFetching = true;

    try {
        const pubhtmlUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQazrkD8DxsLDMhQ4X78vjlIjq1wos7C-0dge7NDG0EBkJ7jhePsJYXCGUvMV79GaNcAa1hJYS_M-5Z/pubhtml';
        const html = await fetchHtmlContent(pubhtmlUrl);
        const newData = parseHtml(html);
        
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

// Load Messages Button
document.getElementById('loadMessagesBtn').addEventListener('click', function() {
    this.style.display = 'none';
    isPollingActive = true;
    document.getElementById('filterButtons').classList.remove('hidden'); // Show filter buttons
    fetchDataAndUpdate();
    pollingInterval = setInterval(() => {
        if (isPollingActive) {
            fetchDataAndUpdate();
        }
    }, 30000);
});

// Filter button click handler
document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', function() {
        // Update active state
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
        
        // Set new filter and refresh display
        currentFilter = this.dataset.filter;
        displayMessages(currentData);
    });
});

// Form Toggle
document.getElementById('toggleFormButton').addEventListener('click', () => {
    const formContainer = document.getElementById('formContainer');
    const cloudWindow = document.getElementById('cloudWindow');
    
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        document.getElementById('toggleFormButton').textContent = 'Close Form';
        if (!cloudWindow.classList.contains('hidden')) {
            cloudWindow.classList.add('hidden');
            document.getElementById('toggleCloudButton').textContent = 'Enter The Cloud';
        }
        isPollingActive = false;
    } else {
        formContainer.classList.add('hidden');
        document.getElementById('toggleFormButton').textContent = 'Open Form';
        if (pollingInterval !== null) {
            isPollingActive = true;
            fetchDataAndUpdate();
        }
    }
});

// Cloud Toggle
document.getElementById('toggleCloudButton').addEventListener('click', () => {
    const cloudWindow = document.getElementById('cloudWindow');
    const formContainer = document.getElementById('formContainer');
    
    // Toggle cloud window
    cloudWindow.classList.toggle('hidden');
    
    // Update button text
    document.getElementById('toggleCloudButton').textContent = 
        cloudWindow.classList.contains('hidden') ? 'Enter The Cloud' : 'Exit The Cloud';
    
    // Control polling - ONLY pause when cloud is open
    if (!cloudWindow.classList.contains('hidden')) {
        // Close form if open
        if (!formContainer.classList.contains('hidden')) {
            formContainer.classList.add('hidden');
            document.getElementById('toggleFormButton').textContent = 'Open Form';
        }
        // Pause polling
        isPollingActive = false;
    } else {
        // Only resume polling if it was active before
        if (pollingInterval !== null) {
            isPollingActive = true;
        }
    }
});

// Other Event Listeners
window.addEventListener('hashchange', scrollToMessage);

document.getElementById('scrollToBottomButton').addEventListener('click', () => {
    document.getElementById('bottom-of-page').scrollIntoView({ behavior: 'smooth' });
});

async function shareChatBubble(chatWrapper, messageId) {
    const shareButton = chatWrapper.querySelector('.share-button');
    shareButton.style.display = 'none';

    const existingOptions = chatWrapper.querySelector('.share-options');
    if (existingOptions) {
        chatWrapper.removeChild(existingOptions);
        shareButton.style.display = 'block';
        return;
    }

    const canvas = await html2canvas(chatWrapper, { backgroundColor: '#e4e0d7' });
    const imgData = canvas.toDataURL("image/png");
    shareButton.style.display = 'block';

    const urlWithoutHash = window.location.href.split('#')[0];
    const fullMessageText = chatWrapper.querySelector('.message').textContent;
    const snippetLength = 100;
    const snippetText = fullMessageText.length > snippetLength ? fullMessageText.substring(0, snippetLength) + '...' : fullMessageText;
    const shareText = `${snippetText} —  ممكن تكتب رد هنا!\n`;

    const shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(urlWithoutHash + '#' + messageId)}`;

    const downloadButton = document.createElement('button');
    downloadButton.className = 'emoji-button';
    downloadButton.innerHTML = '📸';
    downloadButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `message-${messageId}.png`;
        link.click();
    });

    const twitterButton = document.createElement('button');
    twitterButton.className = 'emoji-button';
    twitterButton.innerHTML = '🐦';
    twitterButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = shareLink;
        link.target = '_blank';
        link.click();
    });

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'share-options';
    optionsContainer.appendChild(downloadButton);
    optionsContainer.appendChild(twitterButton);

    chatWrapper.appendChild(optionsContainer);
}
