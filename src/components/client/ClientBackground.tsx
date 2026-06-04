'use client';

import { motion } from 'framer-motion';

interface ClientBackgroundProps {
    brandColor: string;
    secondaryColor: string;
}

export default function ClientBackground({ brandColor, secondaryColor }: ClientBackgroundProps) {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Aurora Backgrounds */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.3, 0.2]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] blur-[120px] rounded-full"
                style={{ backgroundColor: brandColor }}
            />
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[-10%] right-[-20%] w-[300px] h-[300px] blur-[100px] rounded-full"
                style={{ backgroundColor: secondaryColor }}
            />
            
            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px] opacity-80" />
        </div>
    );
}
