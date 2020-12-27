import virtualgs from '@classroomtechtools/virtualgs';
import test from 'ava';

const invoke = virtualgs('project');

test("object tests", async t => {
    await invoke('ObjectStoreTests_');
    t.pass();
});
