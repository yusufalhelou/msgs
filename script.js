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
let currentFilter = 'all'; // Added filter state

// Function to scroll to the specific message
function scrollToMessage() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const messageElement = document.getElementById(`message-${hash}`);
    if (messageElement) {
        // Expand any collapsed replies
        const repliesContainer = document.getElementById(`replies-for-${hash}`);
        if (repliesContainer) {
            repliesContainer.classList.add('visible');
            const toggleIcon = messageElement.querySelector('.reply-indicator span:last-child');
            if (toggleIcon) toggleIcon.innerHTML = '▲';
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
            tag: cells[3]?.innerText.trim() || '' // 4th column for tags
        };
    });
}

function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

// Add this near your other utility functions
function extractMessageIdFromText(text) {
    const urlMatch = text.match(/https?:\/\/51pharmd\.github\.io\/msgs\/#(\d+)/i);
    return urlMatch ? urlMatch[1] : null;
}

function createReplyToggle(replyCount, messageId) {
    const container = document.createElement('div');
    container.className = 'reply-indicator';
    
    const badge = document.createElement('span');
    badge.className = 'reply-badge';
    badge.innerHTML = `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
    
    const icon = document.createElement('span');
    icon.innerHTML = '▼';
    icon.style.fontSize = '0.8em';
    
    container.appendChild(badge);
    container.appendChild(icon);
    
    // Toggle visibility on click
    container.addEventListener('click', (e) => {
        e.stopPropagation();
        const repliesContainer = document.getElementById(`replies-for-${messageId}`);
        repliesContainer.classList.toggle('visible');
        icon.innerHTML = repliesContainer.classList.contains('visible') ? '▲' : '▼';
    });
    
    return container;
}

function createRepliesContainer(messageId) {
    const container = document.createElement('div');
    container.id = `replies-for-${messageId}`;
    container.className = 'replies-container';
    return container;
}

function groupReplies(messages) {
    const replyMap = {};
    
    // First pass: Identify all replies
    messages.forEach((msg, index) => {
        const replyToId = extractMessageIdFromText(msg.message);
        if (replyToId) {
            if (!replyMap[replyToId]) {
                replyMap[replyToId] = [];
            }
            replyMap[replyToId].push(index);
        }
    });

    return replyMap;
}

// Added filter function
function filterMessages(data) {
    switch(currentFilter) {
        case 'all':
            return data;
        case 'pinned':
            return data.filter(entry => entry.tag && entry.tag.includes('📌'));
        case 'latest':
            return data.slice(-5).reverse(); // Get last 5 and reverse to show newest first
        default:
            return data;
    }
}

// Modified displayMessages function
function displayMessages(data) {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = '';
    
    const filteredData = filterMessages(data);
    const replyMap = groupReplies(filteredData);

    // Create all messages first
    const messageElements = filteredData.map((entry, index) => {
        const chatWrapper = document.createElement('div');
        chatWrapper.className = 'chat-wrapper';

        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        const messageId = `${index + 1}`;
        chatBubble.id = `message-${messageId}`;

        // Add pin indicator (only for pinned messages)
        if (entry.tag?.includes('📌')) {
            const pin = document.createElement('div');
            pin.className = 'pin-indicator';
            pin.textContent = '📌';
            chatBubble.appendChild(pin);
        }

        // Add wire and lights decoration
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

        // Create message elements
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
            replyLink.innerHTML = '↩ Replying to #' + replyToId;
            replyLink.href = `#${replyToId}`;
            replyLink.onclick = (e) => {
                e.preventDefault();
                window.location.hash = replyToId;
                scrollToMessage();
            };
            
            chatMessage.appendChild(document.createElement('br'));
            chatMessage.appendChild(replyLink);
        }

        // Add signature image if ⚡️ is found in the tag column
        if (entry.tag?.includes('⚡️') && base64Signature) {
            const signatureImg = document.createElement('img');
            signatureImg.src = base64Signature; // Use preloaded image
            signatureImg.className = 'signature-image';
            signatureImg.style.display = 'block'; // Force visible
            signatureImg.alt = 'Yusuf Alhelou';
            chatBubble.appendChild(signatureImg);
        }

        // Create share button
        const shareButton = document.createElement('button');
        shareButton.className = 'share-button';
        shareButton.innerHTML = '🔗';
        shareButton.addEventListener('click', () => shareChatBubble(chatWrapper, messageId));

        // Append all elements (IN CORRECT ORDER)
        chatBubble.appendChild(chatTimestamp);
        chatBubble.appendChild(chatMessage);
        chatBubble.appendChild(chatSignature);
        chatWrapper.appendChild(chatBubble);
        chatWrapper.appendChild(shareButton);
        
        return { element: chatWrapper, id: messageId };
    });

    // Second pass: Add reply containers and organize threads
    messageElements.forEach(({ element, id }) => {
        if (replyMap[id]?.length) {
            const repliesContainer = createRepliesContainer(id);
            const toggle = createReplyToggle(replyMap[id].length, id);
            
            // Find signature element to append toggle
            const signature = element.querySelector('.signature');
            signature.appendChild(toggle);
            
            // Add replies to container
            replyMap[id].forEach(replyIndex => {
                // Ensure the reply element actually exists in messageElements
                if (messageElements[replyIndex]) {
                    repliesContainer.appendChild(messageElements[replyIndex].element);
                }
            });
            
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
