<style>
#chatbotcontainer {
    max-height: 500px;
    overflow-y: auto;
    border: 1px solid #ccc;
    padding: 10px;
    background: #1a1a1a;
    color: white;
}

.typing-dots::after {
    content: '';
    display: inline-block;
    animation: dots 1s steps(4, end) infinite;
    vertical-align: bottom;
}

@keyframes dots {
    0% { content: ''; }
    25% { content: '.'; }
    50% { content: '..'; }
    75% { content: '...'; }
    100% { content: ''; }
}
</style>

<script>
$(function () {
    $('#sendButton').on('click', sendMessage);
    $('#userInput').keypress(function (e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function scrollToBottom() {
        const chatContainer = document.getElementById("chatbotcontainer");
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function simulateTypingEffect(html, elementId, speed = 10) {
        const container = document.getElementById(elementId);
        container.innerHTML = ''; // Clear target

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        function typeNode(node, parent, done) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                let i = 0;
                const interval = setInterval(() => {
                    if (i < text.length) {
                        parent.append(text[i]);
                        scrollToBottom();
                        i++;
                    } else {
                        clearInterval(interval);
                        done();
                    }
                }, speed);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = document.createElement(node.tagName);
                for (let attr of node.attributes) {
                    el.setAttribute(attr.name, attr.value);
                }
                parent.appendChild(el);

                const children = Array.from(node.childNodes);
                let index = 0;

                function nextChild() {
                    if (index < children.length) {
                        typeNode(children[index], el, () => {
                            index++;
                            nextChild();
                        });
                    } else {
                        done();
                    }
                }

                nextChild();
            } else {
                done();
            }
        }

        const nodes = Array.from(tempDiv.childNodes);
        let index = 0;

        function next() {
            if (index < nodes.length) {
                typeNode(nodes[index], container, () => {
                    index++;
                    next();
                });
            }
        }

        next();
    }

    function sendMessage() {
        const userMessage = $('#userInput').val().trim();
        if (userMessage === '') return;

        $('#aiChatPrev').append(`
            <div class="d-flex justify-content-end align-items-end mb-3">
                <div class="px-3 py-2 text-body bg-white bg-opacity-15 mw-75">${userMessage}</div>
                <div>
                    <div class="w-30px h-30px mx-2 text-white rounded-circle bg-white bg-opacity-15 fs-16px d-flex align-items-center justify-content-center">S</div>
                </div>
            </div>
        `);

        $('#userInput').val('');

        const botMessageId = 'botMsg_' + Date.now();
        const thinkingId = 'thinking_' + botMessageId;

        // Show blinking "Analyzing..." message
        $('#aiChatPrev').append(`
            <div id="${thinkingId}" class="mb-3">
                <div class="d-flex justify-content-start align-items-end">
                    <div>
                        <div class="w-30px h-30px mx-2 fs-16px rounded-circle bg-theme bg-opacity-15 text-theme d-flex align-items-center justify-content-center">
                            <i class="fa fa-robot"></i>
                        </div>
                    </div>
                    <div class="px-3 py-2 text-body bg-white bg-opacity-15 mw-75">
                        <span class="typing-dots">Analyzing</span>
                    </div>
                </div>
            </div>
        `);

        scrollToBottom();

        // AJAX call to backend
        $.ajax({
            url: '/ChatBot/Chat', // Your C# endpoint
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ message: userMessage }),
            success: function (response) {
                const htmlFormatted = marked.parse(response.message);

                // Remove "Analyzing..." message
                $('#' + thinkingId).remove();

                // Add final bot message container
                $('#aiChatPrev').append(`
                    <div class="mb-3">
                        <div class="d-flex justify-content-start align-items-end">
                            <div>
                                <div class="w-30px h-30px mx-2 fs-16px rounded-circle bg-theme bg-opacity-15 text-theme d-flex align-items-center justify-content-center">
                                    <i class="fa fa-robot"></i>
                                </div>
                            </div>
                            <div id="${botMessageId}" class="px-3 py-2 text-body bg-white bg-opacity-15 mw-75"></div>
                        </div>
                    </div>
                `);

                simulateTypingEffect(htmlFormatted, botMessageId);
            },
            error: function () {
                $('#' + thinkingId).remove();
                $('#aiChatPrev').append(`<div class="text-danger">Error communicating with the bot.</div>`);
            }
        });
    }
});
</script>
