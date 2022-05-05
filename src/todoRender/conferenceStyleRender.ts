export function conferenceStyleRender(markdownIt, _options) {
    const defaultRender = markdownIt.renderer.rules.text || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options, env, self);
    };

    markdownIt.renderer.rules.text = function (tokens, idx, options, env, self) {
        if (tokens.length >= 3 && tokens[0].type === "checkbox_wrapper_open"
            && tokens[tokens.length - 1].type === "checkbox_wrapper_close") {
            let result = defaultRender(tokens, idx, options, env, self);

            // todo: optimize the implementation. Or each string needs to be visited for 4x times
            let assignee = result.match(/@\S*/);
            if (assignee) {
                result = result.replace(assignee[0], `<span class="inline-todo inline-todo-assignee">${assignee[0]}</span>`);
            }

            let tags = result.matchAll(/\+\S*/g);
            if (tags) {
                for (let tag of tags) {
                    result = result.replace(tag, `<span class="inline-todo inline-todo-tag tag tag-right">${tag}</span>`);
                }
            }

            let date = result.match(/\/\/\S*/);
            if (date) {
                result = result.replace(date[0], `<span class="inline-todo inline-todo-date">${date[0].substr(2)}</span>`);
            }

            return result
        } else {
            return defaultRender(tokens, idx, options, env, self);
        }
    }
}