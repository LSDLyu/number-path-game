// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { NumberPathGame } from './NumberPathGame';
import puzzles from './number-path-puzzles.json';
import './dialogTestSupport';
const key='zide-number-path-progress-v1';
beforeEach(()=>localStorage.clear());afterEach(cleanup);
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name}));
const saved=()=>JSON.parse(localStorage.getItem(key)!);
it('guided practice does not change unlocks, and explains illegal moves',async()=>{
  render(<NumberPathGame/>);await screen.findByText(/继续勘察第/);
  click('跟我练一题');const dialog=screen.getByRole('dialog');
  const cells=within(dialog).getAllByRole('button').filter(b=>b.getAttribute('aria-label')?.includes(' 行 '));
  fireEvent.click(cells[4]);expect(within(dialog).getByText(/不能斜走/)).toBeTruthy();
  for(const cell of [1,2,5,4,3,6,7,8])fireEvent.click(cells[cell]);
  expect(within(dialog).getByText(/完成！按顺序/)).toBeTruthy();
  click('开始自己破案 →');expect(saved().completed).toEqual({});
});
it('persists hint-assisted completion, independent replay, timer choice and records',async()=>{
  let view=render(<NumberPathGame/>);await screen.findByText(/继续勘察第/);
  click('给我一条线索');click('给我一条线索');click('给我一条线索');
  expect(saved().learning['3-1'].hints).toBe(3);
  view.unmount();view=render(<NumberPathGame/>);await screen.findByText(/继续勘察第/);
  const solve=()=>puzzles['3'][0].route.slice(1).forEach(([r,c])=>fireEvent.click(screen.getByRole('gridcell',{name:new RegExp(`^${r+1} 行 ${c+1} 列`)})));
  solve();expect(saved().learning['3-1']).toMatchObject({solves:1,independent:0,lastHints:3});
  click('重新开始');click('清空路线，重新开始');solve();
  expect(saved().learning['3-1']).toMatchObject({solves:2,independent:1,lastHints:0});
  click('体验设置');fireEvent.click(screen.getByRole('checkbox',{name:'显示计时（关闭后安心思考）'}));click('关闭面板');
  expect(screen.queryByLabelText(/本次用时/)).toBeNull();
  click('学习记录 · 家长查看');expect(screen.getByText(/独立完成 1 次 · 辅助完成 1 次/)).toBeTruthy();
  click('关闭面板');view.unmount();render(<NumberPathGame/>);await screen.findByText(/已归档/);
  expect(screen.queryByLabelText(/本次用时/)).toBeNull();
});
