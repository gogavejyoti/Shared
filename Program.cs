function simulateTypingEffect(html, elementId, speed = 5) {
    const container = document.getElementById(elementId);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const nodes = Array.from(tempDiv.childNodes);
    let nodeIndex = 0;
    let charIndex = 0;

    function typeNext() {
        if (nodeIndex >= nodes.length) return;

        const currentNode = nodes[nodeIndex];

        if (currentNode.nodeType === Node.TEXT_NODE) {
            const text = currentNode.textContent;
            if (charIndex < text.length) {
                container.append(text.charAt(charIndex));
                charIndex++;
                scrollToBottom();
                setTimeout(typeNext, speed);
            } else {
                charIndex = 0;
                nodeIndex++;
                setTimeout(typeNext, speed);
            }
        } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const clone = currentNode.cloneNode(false);
            container.appendChild(clone);
            scrollToBottom();

            const childHTML = currentNode.innerHTML;
            if (childHTML) {
                simulateTypingEffect(childHTML, clone.id || clone.tagName.toLowerCase(), speed);
            }

            nodeIndex++;
            setTimeout(typeNext, speed);
        } else {
            nodeIndex++;
            setTimeout(typeNext, speed);
        }
    }

    typeNext();
}
