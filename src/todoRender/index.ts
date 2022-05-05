import {conferenceStyleRender} from "./conferenceStyleRender";

export default function (context) {
    return {
        plugin: function (markdownIt, _options) {
            const pluginId = context.pluginId;

            conferenceStyleRender(markdownIt, _options);
        },
        assets: function() {
            return [
                { name: 'todoRender.css' }
            ];
        },
    }
}