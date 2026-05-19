import { parseHtml } from '../src/parser/htmlParser';

const html = `
<body>
    <h2 class="heading">Hello<br>World</h2>
    <p>This is a<br>paragraph.</p>
</body>
`;

const result = parseHtml(html);
console.log(JSON.stringify(result.nodes, null, 2));
