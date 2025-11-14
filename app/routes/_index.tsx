"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "~/components/v0/sidebar"
import { VerticalNavbar } from "~/components/v0/vertical-navbar"
import { ChatInterface } from "~/components/v0/chat-interface"
import { Preview } from "~/components/workbench/Preview/Preview"
import { json, type MetaFunction } from '~/lib/remix-types';

export const meta: MetaFunction = () => {
  return [{ title: 'Nut' }];
};

export const loader = () => json({});

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted ? <>{children}</> : null;
}

export default function V0Page() {
  const [isChatStarted, setIsChatStarted] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [chatKey, setChatKey] = useState(0)

  const handleFirstMessage = () => {
    setIsChatStarted(true)
    setMessageCount(1)
    setIsSidebarOpen(false)
  }

  const handleSecondMessage = () => {
    setMessageCount((prev) => prev + 1)
    if (messageCount === 1) {
      setShowPreview(true)
    }
  }

  const handleReset = () => {
    setShowPreview(false)
    setTimeout(() => {
      setIsChatStarted(false)
      setMessageCount(0)
      setIsSidebarOpen(true)
      setChatKey((prev) => prev + 1)
    }, 700)
  }

  return (
    <ClientOnly>
      <div className="relative flex h-screen w-full overflow-hidden bg-background">
        <VerticalNavbar isSidebarOpen={isSidebarOpen} onHomeClick={handleReset} />

        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

        <motion.div
          className="relative flex flex-1 overflow-hidden"
          initial={{ marginLeft: "200px" }}
          animate={{ marginLeft: isSidebarOpen ? "200px" : "0px" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="flex flex-1 pr-3 pt-3 pb-3 gap-3 overflow-hidden">
            <motion.div
              className="flex flex-col relative"
              initial={{ width: "100%" }}
              animate={{ width: showPreview ? "50%" : "100%" }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChatInterface
                key={chatKey}
                isChatStarted={isChatStarted}
                onFirstMessage={handleFirstMessage}
                onMessage={handleSecondMessage}
              />
            </motion.div>

            <AnimatePresence>
              {showPreview && (
                <motion.div
                  className="relative"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "50%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Preview />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </ClientOnly>
  )
}
