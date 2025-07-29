var messages = new List<ChatMessage>
{
    new ChatMessage(ChatRole.System, "You are a helpful assistant."),
    new ChatMessage(ChatRole.User, "Explain cloud computing in **Markdown** format.")
};

var request = new ChatCompletionsOptions
{
    Messages = messages,
    Temperature = 0.7f,
    MaxTokens = 1000,
    Model = "gpt-35-turbo"
};

var response = await openAIClient.GetChatCompletionsAsync(deploymentName, request);
var message = response.Value.Choices[0].Message.Content;

return Json(new { message });





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

    function simulateTypingEffect(html, elementId, speed = 5) {
        const container = document.getElementById(elementId);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const allNodes = Array.from(tempDiv.childNodes);

        let nodeIndex = 0;
        let charIndex = 0;
        let currentText = '';

        function type() {
            if (nodeIndex >= allNodes.length) return;

            const node = allNodes[nodeIndex];

            if (node.nodeType === Node.TEXT_NODE) {
                currentText = node.textContent;
                if (charIndex < currentText.length) {
                    container.innerHTML += currentText.charAt(charIndex);
                    charIndex++;
                    scrollToBottom();
                    setTimeout(type, speed);
                } else {
                    charIndex = 0;
                    nodeIndex++;
                    setTimeout(type, speed);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                container.appendChild(node.cloneNode(true));
                scrollToBottom();
                nodeIndex++;
                setTimeout(type, speed);
            } else {
                nodeIndex++;
                setTimeout(type, speed);
            }
        }

        type();
    }

    function sendMessage() {
        const userMessage = $('#userInput').val().trim();
        if (userMessage === '') return;

        // Append user message to chat
        $('#aiChatPrev').append(`
            <div class="d-flex justify-content-end align-items-end mb-3">
                <div class="px-3 py-6px text-body bg-white bg-opacity-15 mw-75">${userMessage}</div>
                <div>
                    <div class="w-30px h-30px mx-2 text-white rounded-circle bg-white bg-opacity-15 fs-16px d-flex align-items-center justify-content-center">S</div>
                </div>
            </div>
        `);

        $('#userInput').val('');

        const botMessageId = 'botMsg_' + Date.now();

        $('#aiChatPrev').append(`
            <div class="mb-3">
                <div class="d-flex justify-content-start align-items-end">
                    <div>
                        <div class="w-30px h-30px mx-2 fs-16px rounded-circle bg-theme bg-opacity-15 text-theme d-flex align-items-center justify-content-center">
                            <i class="fa fa-robot"></i>
                        </div>
                    </div>
                    <div id="${botMessageId}" class="px-3 py-6px text-body bg-white bg-opacity-15 mw-75"></div>
                </div>
            </div>
        `);

        scrollToBottom();

        // Send user message to backend
        $.ajax({
            url: '/ChatBot/Chat', // Your C# controller endpoint
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ message: userMessage }), // Adjust if needed
            success: function (response) {
                // Convert markdown to HTML
                const htmlFormatted = marked.parse(response.message);
                simulateTypingEffect(htmlFormatted, botMessageId);
            },
            error: function () {
                $('#' + botMessageId).html('<span class="text-danger">Error communicating with the chatbot.</span>');
            }
        });
    }
});



<!-- Include jQuery -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<!-- Include marked.js for Markdown to HTML -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<!-- Chatbot UI -->
<div id="chatbotcontainer" style="max-height: 500px; overflow-y: auto;">
    <div id="aiChatPrev"></div>
</div>

<textarea id="userInput" class="form-control mt-3" rows="2" placeholder="Type your message..."></textarea>
<button id="sendButton" class="btn btn-primary mt-2">Send</button>
