import React, { useEffect, useRef, useState } from 'react';

interface TechStack {
  name: string;
  level: string;
  confidence: number;
}

interface GithubStats {
  repos: number;
  followers: number;
  stars: number;
  forks: number;
  languages: { [key: string]: number };
}

interface User {
  id: string;
  name: string;
  github_username: string;
  avatar_url: string;
  bio?: string | null;
  tech_stack: TechStack[];
  github_stats: GithubStats;
  projects: string[];
  seeking: string[];
  last_updated: string;
}

interface NetworkGraphProps {
  users: User[];
  selectedUser: User | null;
  searchTerm: string;
  onUserSelect: (user: User) => void;
}

interface GraphNode {
  id: string;
  user: User;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  isHighlighted: boolean;
  isSearched: boolean;
  isSelected: boolean;
  pulsePhase: number;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  strength: number;
  isActive: boolean;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  users,
  selectedUser,
  searchTerm,
  onUserSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; user: User } | null>(null);
  const [clickedNode, setClickedNode] = useState<GraphNode | null>(null);
  const [animationTime, setAnimationTime] = useState(0);

  // Fixed dimensions
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;

  // Initialize graph structure
  useEffect(() => {
    if (users.length === 0) return;

    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const radius = Math.min(centerX, centerY) * 0.6;

    // Create nodes with glow properties
    const newNodes: GraphNode[] = users.map((user, index) => {
      const angle = (index / users.length) * 2 * Math.PI;
      const { color, glowColor } = getNodeColors(user);
      
      return {
        id: user.id,
        user,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: 22,
        color,
        glowColor,
        isHighlighted: false,
        isSearched: false,
        isSelected: selectedUser?.id === user.id,
        pulsePhase: Math.random() * Math.PI * 2 // Random pulse phase
      };
    });

    // Create meaningful connections
    const newEdges: GraphEdge[] = [];
    
    newNodes.forEach((sourceNode, i) => {
      const similarities = newNodes
        .filter((_, j) => j !== i)
        .map(targetNode => ({
          node: targetNode,
          similarity: calculateConnectionStrength(sourceNode.user, targetNode.user)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, Math.min(3, users.length - 1));

      similarities.forEach(({ node, similarity }) => {
        if (similarity > 0.3) {
          newEdges.push({
            source: sourceNode,
            target: node,
            strength: similarity,
            isActive: false
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [users, selectedUser]);

  // Update node states and animation
  useEffect(() => {
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        isSearched: searchTerm ? 
          node.user.github_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.user.tech_stack.some(tech => 
            tech.name.toLowerCase().includes(searchTerm.toLowerCase())
          ) : false,
        isSelected: selectedUser?.id === node.user.id,
        isHighlighted: hoveredNode?.id === node.user.id,
        pulsePhase: node.pulsePhase + 0.05 // Continuous pulse animation
      }))
    );

    // Update edge activity based on hover
    setEdges(prevEdges => 
      prevEdges.map(edge => ({
        ...edge,
        isActive: hoveredNode && 
          (edge.source.id === hoveredNode.id || edge.target.id === hoveredNode.id)
      }))
    );

    // Update animation time for global effects
    const timer = setTimeout(() => setAnimationTime(prev => prev + 1), 50);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedUser, hoveredNode]);

  // Enhanced animation loop with glow effects
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const animate = () => {
      // Clear with dark background for glow effects
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw background glow effects
      drawBackgroundGlow(ctx);

      // Update positions
      const updatedNodes = nodes.map(node => applyForces(node, nodes, edges));
      
      // Draw elements with glow
      drawEdges(ctx, updatedNodes, edges);
      updatedNodes.forEach(node => drawNode(ctx, node, animationTime));

      // Draw tooltip
      if (tooltip) {
        drawTooltip(ctx, tooltip);
      }

      // Draw connection lines when hovering
      if (hoveredNode) {
        drawHoverConnections(ctx, updatedNodes, edges, hoveredNode);
      }

      setNodes(updatedNodes);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, edges, tooltip, hoveredNode, animationTime]);

  const drawBackgroundGlow = (ctx: CanvasRenderingContext2D) => {
    // Create subtle background glow effects
    const time = Date.now() / 1000;
    
    // Large background circles
    const gradients = [
      { x: 200, y: 100, color: 'rgba(99, 102, 241, 0.03)' },
      { x: 600, y: 300, color: 'rgba(139, 92, 246, 0.03)' },
      { x: 400, y: 200, color: 'rgba(6, 182, 212, 0.02)' }
    ];

    gradients.forEach((grad, i) => {
      const pulse = 0.8 + 0.2 * Math.sin(time + i);
      const gradient = ctx.createRadialGradient(grad.x, grad.y, 0, grad.x, grad.y, 300);
      gradient.addColorStop(0, grad.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.globalAlpha = pulse * 0.5;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    });

    ctx.globalAlpha = 1;
  };

  const applyForces = (node: GraphNode, allNodes: GraphNode[], allEdges: GraphEdge[]): GraphNode => {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const updatedNode = { ...node };

    // Reset forces with damping
    updatedNode.vx *= 0.7;
    updatedNode.vy *= 0.7;

    // Node repulsion
    allNodes.forEach(other => {
      if (other.id === node.id) return;
      
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0 && distance < 150) {
        const force = 1000 / (distance * distance);
        updatedNode.vx += (dx / distance) * force;
        updatedNode.vy += (dy / distance) * force;
      }
    });

    // Edge attraction
    allEdges.forEach(edge => {
      if (edge.source.id === node.id || edge.target.id === node.id) {
        const other = edge.source.id === node.id ? edge.target : edge.source;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const force = (distance - 100) * 0.015 * edge.strength;
          updatedNode.vx -= (dx / distance) * force;
          updatedNode.vy -= (dy / distance) * force;
        }
      }
    });

    // Gentle center force
    const dxCenter = centerX - node.x;
    const dyCenter = centerY - node.y;
    const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
    if (distCenter > centerX * 0.5) {
      updatedNode.vx += dxCenter * 0.0002;
      updatedNode.vy += dyCenter * 0.0002;
    }

    // Apply movement
    updatedNode.x += updatedNode.vx * 0.1;
    updatedNode.y += updatedNode.vy * 0.1;

    // Boundary constraints
    const margin = updatedNode.radius + 15;
    updatedNode.x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, updatedNode.x));
    updatedNode.y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, updatedNode.y));

    return updatedNode;
  };

  const drawEdges = (ctx: CanvasRenderingContext2D, nodes: GraphNode[], edges: GraphEdge[]) => {
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source.id);
      const target = nodes.find(n => n.id === edge.target.id);
      
      if (!source || !target) return;

      // Pulsing edge effect
      const pulse = 0.6 + 0.4 * Math.sin(animationTime * 0.1);
      const alpha = edge.isActive ? 0.8 : 0.3 + edge.strength * 0.3;
      
      ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * pulse})`;
      ctx.lineWidth = edge.isActive ? 3 : 1 + edge.strength * 2;
      ctx.setLineDash(edge.strength > 0.7 ? [] : [2, 2]);

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      // Add glow to active edges
      if (edge.isActive) {
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    ctx.setLineDash([]);
  };

  const drawHoverConnections = (ctx: CanvasRenderingContext2D, nodes: GraphNode[], edges: GraphEdge[], hovered: GraphNode) => {
    // Find connections for hovered node
    const connections = edges.filter(edge => 
      edge.source.id === hovered.id || edge.target.id === hovered.id
    );

    connections.forEach(edge => {
      const other = edge.source.id === hovered.id ? edge.target : edge.source;
      const otherNode = nodes.find(n => n.id === other.id);
      if (!otherNode) return;

      // Draw glowing connection line
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.moveTo(hovered.x, hovered.y);
      ctx.lineTo(otherNode.x, otherNode.y);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
    });
  };

  const drawNode = (ctx: CanvasRenderingContext2D, node: GraphNode, time: number) => {
    const pulse = 0.8 + 0.2 * Math.sin(node.pulsePhase + time * 0.1);
    const scale = 1 + (pulse - 0.8) * 0.2;

    // Outer glow
    ctx.shadowColor = node.glowColor;
    ctx.shadowBlur = node.isSelected ? 25 : node.isHighlighted ? 20 : 15;
    
    // Main node circle with pulse
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius * scale, 0, 2 * Math.PI);
    
    // Node color based on state
    if (node.isSelected) {
      ctx.fillStyle = '#10b981';
    } else if (node.isHighlighted) {
      ctx.fillStyle = '#8b5cf6';
    } else {
      ctx.fillStyle = node.color;
    }
    
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner white circle for contrast
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius * scale * 0.7, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    // User initial
    ctx.fillStyle = node.isSelected || node.isHighlighted ? 'white' : '#1e293b';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      node.user.name?.[0]?.toUpperCase() || node.user.github_username[0].toUpperCase(),
      node.x,
      node.y
    );

    // Search glow effect
    if (node.isSearched) {
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * scale + 5, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Username label with glow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = node.isSearched ? '#3b82f6' : 'rgba(255, 255, 255, 0.9)';
    ctx.font = '9px Arial';
    ctx.textBaseline = 'top';
    ctx.fillText(
      node.user.github_username.length > 8 
        ? node.user.github_username.substring(0, 8) + '...'
        : node.user.github_username,
      node.x,
      node.y + node.radius + 5
    );
    ctx.shadowBlur = 0;
  };

  const drawTooltip = (ctx: CanvasRenderingContext2D, tooltip: { x: number; y: number; user: User }) => {
    const { x, y, user } = tooltip;
    
    const tooltipWidth = 180;
    const tooltipHeight = 100;
    
    // Position adjustment
    const tooltipX = Math.min(x + 15, CANVAS_WIDTH - tooltipWidth - 10);
    const tooltipY = Math.min(y, CANVAS_HEIGHT - tooltipHeight - 10);

    // Tooltip background with glow
    ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.lineWidth = 1;

    // Rounded rectangle
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Content
    ctx.fillStyle = 'white';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(user.name || user.github_username, tooltipX + 10, tooltipY + 18);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Arial';
    ctx.fillText(`@${user.github_username}`, tooltipX + 10, tooltipY + 32);
    
    // Tech preview
    const techs = user.tech_stack.slice(0, 2).map(t => t.name).join(', ');
    ctx.fillText(`Tech: ${techs}`, tooltipX + 10, tooltipY + 46);
    
    // Stats
    ctx.fillText(
      `Repos: ${user.github_stats.repos} | Followers: ${user.github_stats.followers}`,
      tooltipX + 10,
      tooltipY + 60
    );

    // Click hint
    ctx.fillStyle = '#10b981';
    ctx.font = 'italic 9px Arial';
    ctx.fillText('Click to select', tooltipX + 10, tooltipY + 78);
  };

  const calculateConnectionStrength = (user1: User, user2: User): number => {
    let strength = 0;
    
    // Common technologies
    const techs1 = user1.tech_stack.map(t => t.name.toLowerCase());
    const techs2 = user2.tech_stack.map(t => t.name.toLowerCase());
    const commonTechs = techs1.filter(tech => techs2.includes(tech));
    strength += commonTechs.length * 0.4;
    
    // Similar activity level
    const activity1 = user1.github_stats.repos + user1.github_stats.followers;
    const activity2 = user2.github_stats.repos + user2.github_stats.followers;
    const activityDiff = Math.abs(activity1 - activity2);
    strength += (1 - Math.min(activityDiff / 50, 1)) * 0.3;
    
    return Math.min(strength, 1);
  };

  const getNodeColors = (user: User): { color: string; glowColor: string } => {
    const activity = user.github_stats.repos + user.github_stats.followers;
    if (activity > 30) return { color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.5)' };
    if (activity > 10) return { color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.5)' };
    return { color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.5)' };
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const clickedNode = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });

    if (clickedNode) {
      setClickedNode(clickedNode);
      setTimeout(() => setClickedNode(null), 300); // Reset after animation
      onUserSelect(clickedNode.user);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const hovered = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });

    setHoveredNode(hovered || null);
    setTooltip(hovered ? { x, y, user: hovered.user } : null);
  };

  const handleCanvasMouseLeave = () => {
    setHoveredNode(null);
    setTooltip(null);
  };

  if (users.length === 0) {
    return (
      <div style={{
        background: 'var(--gradient-card)',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center',
        border: '1px solid var(--border)',
        margin: '1rem 0'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.7 }}>🌐</div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>Developer Network</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Add GitHub users to see the glowing network graph
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--gradient-card)',
      borderRadius: '12px',
      padding: '1rem',
      border: '1px solid var(--border)',
      margin: '1rem 0'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{ 
          color: 'var(--text-primary)',
          margin: 0,
          fontSize: '1rem',
          fontWeight: '600'
        }}>
          🌐 Interactive Network Graph
        </h3>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }}></div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#f59e0b',
              boxShadow: '0 0 8px #f59e0b'
            }}></div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Medium</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#ef4444',
              boxShadow: '0 0 8px #ef4444'
            }}></div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Low</span>
          </div>
        </div>
      </div>
      
      {/* Canvas Container */}
      <div style={{
        width: '100%',
        height: '400px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0f172a',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border)'
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          style={{
            width: '100%',
            maxWidth: '800px',
            height: '400px',
            cursor: hoveredNode ? 'pointer' : 'default',
            display: 'block'
          }}
        />
      </div>
      
      {/* Interactive Guide */}
      <div style={{
        marginTop: '0.75rem',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        lineHeight: '1.3'
      }}>
        <div>
          <strong>✨ Interactive Features:</strong> Hover to see connections • Click to select • 
          <span style={{ color: '#3b82f6' }}> Blue glow</span> = Search match
        </div>
        <div style={{ marginTop: '0.25rem' }}>
          <span style={{ color: '#10b981' }}>Green</span> = High activity • 
          <span style={{ color: '#f59e0b' }}> Yellow</span> = Medium • 
          <span style={{ color: '#ef4444' }}> Red</span> = Low activity
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;