$(function () {
    $('#sendButton').on('click', function () {
        sendMessage();
    });

    $('#userInput').keypress(function (e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });



    function scrollToBottom() {
        const chatContainer = document.getElementById("chatbotcontainer");
        chatContainer.scrollTop = chatContainer.scrollHeight
    }


    function simulateTypingEffect(text, elementId, speed = 30) {
        let index = 0;
        const container = document.getElementById(elementId);
        const interval = setInterval(() => {
            if (index < text.length) {
                container.innerHTML += text.charAt(index);
                index++;
                scrollToBottom();
            } else {
                clearInterval(interval);
            }
        }, speed);
    }


    function sendMessage() {
        const userMessage = $('#userInput').val().trim();
        if (userMessage === '') return;

        $('#aiChatIntro').hide(); // Hide intro

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
         //AJAX call to backend
        $.ajax({
            url: '/ChatBot/Chat', // Change this to your backend endpoint
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(userMessage),
            success: function (response) {

                const botMessageId = 'botMsg_' + Date.now();

                $('#aiChatPrev').append(`
  <div class="mb-3">
    <div class="d-flex justify-content-start align-items-end">
      <div>
        <div class="w-30px h-30px mx-2 fs-16px rounded-circle bg-theme bg-opacity-15 text-theme d-flex align-items-center justify-content-center">
          <i class="fa fa-shekel-sign"></i>
        </div>
      </div>
      <div id="${botMessageId}" class="px-3 py-6px text-body bg-white bg-opacity-15 mw-75"></div>
    </div>
    <div class="d-flex">
      <div class="w-30px h-30px mx-3"></div>
      <div class="d-flex flex-wrap w-100 p-2 opacity-75">
        <a href="#" class="text-white text-opacity-50 text-decoration me-2"><i class="far fa-fw fa-copy"></i></a>
        <a href="#" class="text-white text-opacity-50 text-decoration me-2"><i class="far fa-fw fa-thumbs-up"></i></a>
        <a href="#" class="text-white text-opacity-50 text-decoration me-2"><i class="far fa-fw fa-thumbs-down"></i></a>
        <a href="#" class="text-white text-opacity-50 text-decoration me-2"><i class="fa fa-fw fa-microphone"></i></a>
        <a href="#" class="text-white text-opacity-50 text-decoration"><i class="fa fa-fw fa-arrow-rotate-right"></i></a>
      </div>
    </div>
  </div>
`);

                simulateTypingEffect(response.message, botMessageId);


            },
            error: function () {
                alert('Error communicating with the chatbot.');
            }
        });
    }
});
