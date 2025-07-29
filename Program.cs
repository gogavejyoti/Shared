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
            // Copy attributes like class, href, etc.
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
