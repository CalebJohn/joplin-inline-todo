export function conferenceStyleRender(markdownIt, _options) {
    const defaultRender = markdownIt.renderer.rules.text || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options, env, self);
    };

    markdownIt.renderer.rules.text = function (tokens, idx, options, env, self) {
        if (tokens.length >= 3 && tokens[0].type === "checkbox_wrapper_open"
            && tokens[tokens.length - 1].type === "checkbox_wrapper_close") {
            let result = defaultRender(tokens, idx, options, env, self);

            let modifiedResult = '';
            let lastIndex = 0;
            let inKeywords = false;
            let keywordBegin = -1;
            for (let i = 0; i < result.length; ++i) {
                if (result[i] === '@') {
                    if (i > 0 && result[i - 1].trim() === '' || i === 0) {
                        modifiedResult += result.substr(lastIndex, i - lastIndex);
                        inKeywords = true;
                        keywordBegin = i;
                    }
                } else if (result[i] === '+') {
                    if (i > 0 && result[i - 1].trim() === '' || i === 0) {
                        modifiedResult += result.substr(lastIndex, i - lastIndex);
                        inKeywords = true;
                        keywordBegin = i;
                    }
                } else if (result[i] === '/') {
                    if (i > 1 && result[i - 2].trim() === '' || i === 1) {
                        modifiedResult += result.substr(lastIndex, i - 1 - lastIndex);
                        inKeywords = true;
                        keywordBegin = i - 1;
                    }
                }

                if ((result[i].trim() === '' || i + 1 === result.length) && inKeywords) {
                    inKeywords = false;
                    let length = i - keywordBegin;
                    lastIndex = i;
                    if (i + 1 === result.length) {
                        length += 1;
                        lastIndex = i + 1;
                    }
                    let keywords = result.substr(keywordBegin, length);
                    switch (result[keywordBegin]) {
                        case '@':
                            if (keywords.length > 1) {
                                modifiedResult += `<span class="inline-todo inline-todo-assignee">${keywords}</span>`;
                            } else {
                                modifiedResult += keywords;
                            }
                            break;
                        case '+':
                            if (keywords.length > 1) {
                                modifiedResult += `<span class="inline-todo inline-todo-tag tag tag-right">${keywords}</span>`;
                            } else {
                                modifiedResult += keywords;
                            }
                            break;
                        case '/':
                            if (keywords.length > 2) {
                                modifiedResult += `<span class="inline-todo inline-todo-date">${keywords.substr(2)}</span>`;
                            } else {
                                modifiedResult += keywords;
                            }
                            break;
                        default:
                            break;
                    }
                }
            }
            modifiedResult += result.substr(lastIndex);

            return modifiedResult;
        } else {
            return defaultRender(tokens, idx, options, env, self);
        }
    }
}