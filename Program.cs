function simulateTypingEffect(html, elementId, speed = 10) {
    const container = document.getElementById(elementId);
    container.innerHTML = ''; // Clear target container

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const nodes = Array.from(tempDiv.childNodes);

    let currentNodeIndex = 0;
    let charIndex = 0;
    let currentText = '';
    let typingInterval;

    function typeNextChar() {
        if (currentNodeIndex >= nodes.length) {
            clearInterval(typingInterval);
            return;
        }

        const node = nodes[currentNodeIndex];

        if (node.nodeType === Node.TEXT_NODE) {
            if (currentText === '') currentText = node.textContent;

            if (charIndex < currentText.length) {
                container.innerHTML += currentText.charAt(charIndex);
                charIndex++;
                scrollToBottom();
            } else {
                charIndex = 0;
                currentText = '';
                currentNodeIndex++;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            container.appendChild(node.cloneNode(true)); // Append full element
            currentNodeIndex++;
        } else {
            currentNodeIndex++;
        }
    }

    typingInterval = setInterval(typeNextChar, speed);
}
