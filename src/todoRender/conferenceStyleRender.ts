export function conferenceStyleRender(markdownIt, _options) {
    const defaultRender = markdownIt.renderer.rules.text || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options, env, self);
    };

    markdownIt.renderer.rules.text = function (tokens, idx, options, env, self) {
        if (tokens.length >= 3 && tokens[0].type === "checkbox_wrapper_open"
            && tokens[tokens.length - 1].type === "checkbox_wrapper_close") {
            console.log(markdownIt.renderer.rules);
            console.log(tokens, idx);
            const token = tokens[idx];
            let result = defaultRender(tokens, idx, options, env, self);

            // todo: optimize the implementation. Or each string needs to be visited for 4x times
            let assignee = result.match(/@\S*/);
            if (assignee) {
                result = result.replace(assignee[0], `[${assignee[0]}]`);
            }

            let tags = result.match(/\+\S*/);
            if (tags) {
                for (let tag of tags) {
                    result = result.replace(tag, `<${tag}>`);
                }
            }

            let date = result.match(/\/\/\S*/);
            if (date) {
                result = result.replace(date[0], `{${date[0]}}`);
            }

            console.log(result);

            return result
        } else {
            return defaultRender(tokens, idx, options, env, self);
        }
    }
}