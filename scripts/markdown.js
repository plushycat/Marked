// Markdown parsing functionality
// Markdown conversion
function markdownToHtml(markdownText) {
    if (!markdownText) return '';
    
    return markdownText
        .replace(/(?:\r\n|\r|\n)/g, '\n')
        // Handle multiline code blocks FIRST (before other processing)
        .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        // Handle spoiler tags (WITHOUT onclick - we use event delegation)
        .replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler">$1</span>')
        .replace(/<spoiler>(.*?)<\/spoiler>/g, '<span class="spoiler">$1</span>')
        // Handle headers
        .replace(/^######\s?(.*)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s?(.*)$/gm, '<h5>$1</h5>')
        .replace(/^####\s?(.*)$/gm, '<h4>$1</h4>')
        .replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
        .replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
        .replace(/^#\s?(.*)$/gm, '<h1>$1</h1>')
        // Handle text formatting
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // Handle inline code (after multiline code)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Handle blockquotes - FIXED VERSION
        .replace(/^>\s?(.*)$/gm, '<!BLOCKQUOTE!>$1')
        .replace(/(<!BLOCKQUOTE!>.*(?:\n<!BLOCKQUOTE!>.*)*)/g, function(match) {
            const content = match.replace(/<!BLOCKQUOTE!>/g, '').trim();
            return `<blockquote>${content}</blockquote>`;
        })
        // Handle lists (supports nesting, both unordered and ordered)
        .replace(/((?:^(?:\s*)(?:[-*+]|\d+\.)\s+.*\n?)+)/gm, function(listBlock) {
            const lines = listBlock.trimEnd().split('\n');
            let html = '';
            let stack = [];
            lines.forEach(line => {
                const match = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
                if (match) {
                    const indent = Math.floor(match[1].replace(/\t/g, '  ').length / 2);
                    const isOrdered = /^\d+\.$/.test(match[2]);
                    const tag = isOrdered ? 'ol' : 'ul';

                    // Open new list(s) if indent increased
                    while (stack.length < indent + 1) {
                        html += `<${tag}>`;
                        stack.push(tag);
                    }
                    // Close list(s) if indent decreased
                    while (stack.length > indent + 1) {
                        html += `</${stack.pop()}>`;
                    }
                    // If type changed at this level, close and reopen
                    if (stack[stack.length - 1] !== tag) {
                        html += `</${stack.pop()}>`;
                        html += `<${tag}>`;
                        stack.push(tag);
                    }
                    html += `<li>${match[3]}</li>`;
                }
            });
            // Close any remaining open lists
            while (stack.length) {
                html += `</${stack.pop()}>`;
            }
            return html;
        })
        // Handle links and images
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/!\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<img src="$2" alt="$1" />')
        
        // Handle password content: p{secret}p or p secret p
        .replace(/p\s*\{(.*?)\}\s*p/g, (match, content) => {
            return `<span class="password-content">${content}</span>`;
        })
        // Convert remaining lines to paragraphs
        .replace(/^(?!<[^>]+>|\s*[\-\*\+]\s|\d+\.\s|#|>|\s*$)(.+)$/gm, '<p>$1</p>')
        // Clean up empty paragraphs
        .replace(/<p>\s*<\/p>/g, '');
}

// Spoiler toggle functionality
function toggleSpoiler(element) {
    console.log('Toggling spoiler:', element); // Debug log
    element.classList.toggle('revealed');
}

// Export for use by other modules
window.markdown = {
    markdownToHtml,
    toggleSpoiler
};