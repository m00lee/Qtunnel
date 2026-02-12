'use client'

import { useEffect, useRef } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  KEY_TAB_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from 'lexical'

// ── 内部插件：初始化内容 ──
function SetContentPlugin({ code }: { code: string }) {
  const [editor] = useLexicalComposerContext()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    editor.update(() => {
      const root = $getRoot()
      root.clear()
      const lines = code.split('\n')
      for (const line of lines) {
        const p = $createParagraphNode()
        if (line) p.append($createTextNode(line))
        root.append(p)
      }
    })
  }, [editor, code])

  return null
}

// ── 内部插件：Tab → 2 空格 ──
function TabPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event: KeyboardEvent) => {
        event.preventDefault()
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            selection.insertText('  ')
          }
        })
        return true
      },
      COMMAND_PRIORITY_HIGH,
    )
  }, [editor])

  return null
}

// ── 内部插件：内容变化通知 ──
function OnChangePlugin({ onChange }: { onChange: (text: string) => void }) {
  const [editor] = useLexicalComposerContext()
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        callbackRef.current($getRoot().getTextContent())
      })
    })
  }, [editor])

  return null
}

// ── 对外导出 ──
interface LuaEditorProps {
  initialCode: string
  onChange: (code: string) => void
  readOnly?: boolean
}

const theme = {
  paragraph: 'lua-editor-line',
}

export default function LuaEditor({ initialCode, onChange, readOnly = false }: LuaEditorProps) {
  const initialConfig = {
    namespace: 'LuaEditor',
    theme,
    onError: (error: Error) => console.error('[LuaEditor]', error),
    editable: !readOnly,
  }

  return (
    <div className="lua-editor-wrapper h-full flex flex-col">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative flex-1 overflow-auto bg-[#1e1e2e] rounded-lg">
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className="lua-editor-content outline-none p-4 min-h-full font-mono text-[13px] leading-6 text-[#cdd6f4] whitespace-pre caret-[#f5c2e7]"
                spellCheck={false}
              />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-[#585b70] font-mono text-[13px] pointer-events-none select-none">
                -- 在此编写 Lua 脚本...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <TabPlugin />
          <SetContentPlugin code={initialCode} />
          <OnChangePlugin onChange={onChange} />
        </div>
      </LexicalComposer>
    </div>
  )
}
