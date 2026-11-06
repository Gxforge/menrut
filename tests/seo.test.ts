import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileHTML,escapeHTML} from '../src/public/profile-html';
test('Escapa contenido HTML manipulable',()=>{const html=profileHTML({name:'<script>alert(1)</script>',description:'" onload="x',slug:'abc',available:1},'https://example.supabase.co');assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('rel="canonical"'));assert.ok(html.includes('og:title'));});
test('No genera teléfono si no hay referencia pública',()=>{assert.ok(!profileHTML({name:'Mensajero',slug:'abc',available:1},'https://example.supabase.co').includes('tel:'));});
test('Escape de comillas y entidades',()=>assert.equal(escapeHTML('"<&'), '&quot;&lt;&amp;'));
