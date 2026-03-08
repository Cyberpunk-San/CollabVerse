import React from 'react';
import { Box, Toolbar } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Header />
            <Sidebar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0, // Prevent content from pushing layout
                    height: '100vh',
                    overflow: 'hidden'
                }}
            >
                <Toolbar /> {/* Spacer for fixed header */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <Outlet />
                </Box>
                {/* Footer removed from main scroll flow for chat-like experience, 
                    or could be inside the scrollable content of other pages */}
            </Box>
        </Box>
    );
};

export default Layout;
