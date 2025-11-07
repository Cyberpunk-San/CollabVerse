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
  isHighlighted: boolean;
  isSearched: boolean;
  isSelected: boolean;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  strength: number;
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

  // Initialize graph structure
  useEffect(() => {
    if (users.length === 0) return;

    // Create nodes
    const newNodes: GraphNode[] = users.map((user, index) => {
      // Arrange nodes in a circular layout
      const angle = (index / users.length) * 2 * Math.PI;
      const radius = Math.min(250, users.length * 12);
      
      return {
        id: user.id,
        user,
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: 30,
        color: getNodeColor(user),
        isHighlighted: false,
        isSearched: false,
        isSelected: selectedUser?.id === user.id
      };
    });

    // Create edges (connections between nodes)
    const newEdges: GraphEdge[] = [];
    
    // Connect each node to 2-4 other nodes to create a proper graph structure
    newNodes.forEach((sourceNode, i) => {
      // Connect to some random nodes
      const numConnections = Math.floor(Math.random() * 3) + 2; // 2-4 connections
      const connectedIndices = new Set<number>();
      
      while (connectedIndices.size < numConnections && connectedIndices.size < users.length - 1) {
        const targetIndex = Math.floor(Math.random() * users.length);
        if (targetIndex !== i && !connectedIndices.has(targetIndex)) {
          connectedIndices.add(targetIndex);
          
          // Calculate connection strength based on common technologies
          const targetNode = newNodes[targetIndex];
          const strength = calculateConnectionStrength(sourceNode.user, targetNode.user);
          
          newEdges.push({
            source: sourceNode,
            target: targetNode,
            strength: strength
          });
        }
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [users, selectedUser]);

  // Update node states based on search and selection
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
        isHighlighted: hoveredNode?.id === node.user.id
      }))
    );
  }, [searchTerm, selectedUser, hoveredNode]);

  // Animation loop with force-directed graph
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update node positions with force-directed algorithm
      const updatedNodes = nodes.map(node => applyForces(node, nodes, edges));
      
      // Draw edges first (behind nodes)
      drawEdges(ctx, updatedNodes, edges);

      // Draw nodes
      updatedNodes.forEach(node => drawNode(ctx, node));

      setNodes(updatedNodes);

      // Draw tooltip if hovered
      if (tooltip) {
        drawTooltip(ctx, tooltip);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, edges, tooltip]);

  // Force-directed graph algorithm
  const applyForces = (node: GraphNode, allNodes: GraphNode[], allEdges: GraphEdge[]): GraphNode => {
    const updatedNode = { ...node };
    const centerX = 400; // Canvas center
    const centerY = 300;
    const repulsionForce = 10000; // Increased repulsion
    const springForce = 0.1; // Increased spring force
    const damping = 0.9;

    // Reset forces
    updatedNode.vx = 0;
    updatedNode.vy = 0;

    // Repulsion between all nodes
    allNodes.forEach(otherNode => {
      if (otherNode.id === updatedNode.id) return;
      
      const dx = updatedNode.x - otherNode.x;
      const dy = updatedNode.y - otherNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const force = repulsionForce / (distance * distance);
        updatedNode.vx += (dx / distance) * force;
        updatedNode.vy += (dy / distance) * force;
      }
    });

    // Spring forces from edges
    allEdges.forEach(edge => {
      if (edge.source.id === updatedNode.id || edge.target.id === updatedNode.id) {
        const otherNode = edge.source.id === updatedNode.id ? edge.target : edge.source;
        const dx = updatedNode.x - otherNode.x;
        const dy = updatedNode.y - otherNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const force = (distance - 150) * springForce * edge.strength; // Ideal distance 150
          updatedNode.vx -= (dx / distance) * force;
          updatedNode.vy -= (dy / distance) * force;
        }
      }
    });

    // Central gravity force
    const dxCenter = centerX - updatedNode.x;
    const dyCenter = centerY - updatedNode.y;
    const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
    if (distCenter > 0) {
      const centerForce = 0.001 * distCenter;
      updatedNode.vx += (dxCenter / distCenter) * centerForce;
      updatedNode.vy += (dyCenter / distCenter) * centerForce;
    }

    // Apply velocity with damping
    updatedNode.vx *= damping;
    updatedNode.vy *= damping;
    updatedNode.x += updatedNode.vx * 0.1;
    updatedNode.y += updatedNode.vy * 0.1;

    // Boundary constraints
    const margin = updatedNode.radius;
    if (updatedNode.x < margin) updatedNode.x = margin;
    if (updatedNode.x > 800 - margin) updatedNode.x = 800 - margin;
    if (updatedNode.y < margin) updatedNode.y = margin;
    if (updatedNode.y > 600 - margin) updatedNode.y = 600 - margin;

    return updatedNode;
  };

  const drawEdges = (ctx: CanvasRenderingContext2D, nodes: GraphNode[], edges: GraphEdge[]) => {
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source.id);
      const targetNode = nodes.find(n => n.id === edge.target.id);
      
      if (!sourceNode || !targetNode) return;

      // Calculate line properties based on connection strength
      const lineWidth = 1 + (edge.strength * 2);
      const opacity = 0.3 + (edge.strength * 0.4);
      
      ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([]); // Solid line

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();

      // Add arrowhead for directed graph feel
      if (edge.strength > 0.7) {
        drawArrowhead(ctx, sourceNode, targetNode);
      }
    });
  };

  const drawArrowhead = (ctx: CanvasRenderingContext2D, source: GraphNode, target: GraphNode) => {
    const arrowSize = 8;
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const adjustedX = target.x - (target.radius + 5) * Math.cos(angle);
    const adjustedY = target.y - (target.radius + 5) * Math.sin(angle);

    ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.beginPath();
    ctx.moveTo(adjustedX, adjustedY);
    ctx.lineTo(
      adjustedX - arrowSize * Math.cos(angle - Math.PI / 6),
      adjustedY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      adjustedX - arrowSize * Math.cos(angle + Math.PI / 6),
      adjustedY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  const drawNode = (ctx: CanvasRenderingContext2D, node: GraphNode) => {
    // Node glow effect for searched nodes (blue blinking)
    if (node.isSearched) {
      const pulse = 0.5 + 0.3 * Math.sin(Date.now() / 200);
      const gradient = ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, node.radius * 3
      );
      gradient.addColorStop(0, `rgba(59, 130, 246, ${pulse})`);
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(
        node.x - node.radius * 3,
        node.y - node.radius * 3,
        node.radius * 6,
        node.radius * 6
      );
    }

    // Node circle with border
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    
    // Node color based on state
    if (node.isSelected) {
      ctx.fillStyle = '#10b981'; // Green for selected
    } else if (node.isHighlighted) {
      ctx.fillStyle = '#8b5cf6'; // Purple for hovered
    } else {
      ctx.fillStyle = node.color;
    }
    
    ctx.fill();
    
    // Border
    ctx.strokeStyle = node.isSearched ? '#3b82f6' : 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = node.isSearched ? 3 : 2;
    ctx.stroke();

    // Avatar image
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius - 4, 0, 2 * Math.PI);
    ctx.clip();

    const img = new Image();
    img.src = node.user.avatar_url;
    img.onload = () => {
      ctx.drawImage(
        img,
        node.x - node.radius + 4,
        node.y - node.radius + 4,
        (node.radius - 4) * 2,
        (node.radius - 4) * 2
      );
    };
    img.onerror = () => {
      // Fallback to initial
      ctx.restore();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        node.user.name?.[0]?.toUpperCase() || node.user.github_username[0].toUpperCase(),
        node.x,
        node.y
      );
    };

    ctx.restore();

    // Node label (username)
    ctx.fillStyle = node.isSearched ? '#3b82f6' : 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      node.user.github_username,
      node.x,
      node.y + node.radius + 5
    );
  };

  const drawTooltip = (ctx: CanvasRenderingContext2D, tooltip: { x: number; y: number; user: User }) => {
    const { x, y, user } = tooltip;
    
    // Tooltip background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.lineWidth = 2;
    
    const tooltipWidth = 220;
    const tooltipHeight = 140;
    const tooltipX = Math.min(x, ctx.canvas.width - tooltipWidth - 10);
    const tooltipY = Math.min(y, ctx.canvas.height - tooltipHeight - 10);
    
    // Rounded rectangle
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Tooltip content
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(user.name || user.github_username, tooltipX + 10, tooltipY + 25);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Arial';
    ctx.fillText(`@${user.github_username}`, tooltipX + 10, tooltipY + 45);
    
    // Tech stack preview
    const techs = user.tech_stack.slice(0, 3).map(t => t.name).join(', ');
    ctx.fillText(`Tech: ${techs}`, tooltipX + 10, tooltipY + 65);
    
    // Stats
    ctx.fillText(
      `Repos: ${user.github_stats.repos} | Followers: ${user.github_stats.followers}`,
      tooltipX + 10,
      tooltipY + 85
    );

    // Connections info
    const connections = edges.filter(edge => 
      edge.source.user.id === user.id || edge.target.user.id === user.id
    ).length;
    ctx.fillText(`Connections: ${connections}`, tooltipX + 10, tooltipY + 105);

    // Click hint
    ctx.fillStyle = '#10b981';
    ctx.font = 'italic 11px Arial';
    ctx.fillText('Click to select', tooltipX + 10, tooltipY + 125);
  };

  const calculateConnectionStrength = (user1: User, user2: User): number => {
    let strength = 0;
    
    // Common technologies
    const techs1 = user1.tech_stack.map(t => t.name.toLowerCase());
    const techs2 = user2.tech_stack.map(t => t.name.toLowerCase());
    const commonTechs = techs1.filter(tech => techs2.includes(tech));
    strength += commonTechs.length * 0.2;
    
    // Similar activity level
    const activity1 = user1.github_stats.repos + user1.github_stats.followers;
    const activity2 = user2.github_stats.repos + user2.github_stats.followers;
    const activityDiff = Math.abs(activity1 - activity2);
    strength += (1 - Math.min(activityDiff / 50, 1)) * 0.3;
    
    // Common languages
    const langs1 = Object.keys(user1.github_stats.languages || {});
    const langs2 = Object.keys(user2.github_stats.languages || {});
    const commonLangs = langs1.filter(lang => langs2.includes(lang));
    strength += commonLangs.length * 0.2;
    
    return Math.min(strength, 1);
  };

  const getNodeColor = (user: User): string => {
    const activity = user.github_stats.repos + user.github_stats.followers;
    if (activity > 50) return '#10b981'; // High activity - green
    if (activity > 20) return '#f59e0b'; // Medium activity - yellow
    return '#ef4444'; // Low activity - red
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked node
    const clickedNode = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });

    if (clickedNode) {
      onUserSelect(clickedNode.user);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find hovered node
    const hovered = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });

    setHoveredNode(hovered || null);
    
    if (hovered) {
      setTooltip({ x, y, user: hovered.user });
    } else {
      setTooltip(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredNode(null);
    setTooltip(null);
  };

  if (users.length === 0) {
    return (
      <div className="graph-container" style={{
        background: 'var(--gradient-card)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center',
        border: '1px solid var(--border)'
      }}>
        <div className="empty-icon">🌐</div>
        <h3>Network Graph</h3>
        <p>No users to display. Add some GitHub users to see the network!</p>
      </div>
    );
  }

  return (
    <div className="network-graph" style={{
      background: 'var(--gradient-card)',
      borderRadius: '16px',
      padding: '1rem',
      border: '1px solid var(--border)',
      margin: '1rem 0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '0 0.5rem'
      }}>
        <h3 style={{ 
          color: 'var(--text-primary)',
          margin: 0,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🌐 Developer Network Graph
        </h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
            <span>Searched (Blinking)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
            <span>Selected</span>
          </div>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        style={{
          width: '100%',
          height: '400px',
          borderRadius: '12px',
          cursor: hoveredNode ? 'pointer' : 'default',
          background: 'var(--bg-primary)'
        }}
      />
      
      <div style={{
        marginTop: '1rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        <p>🌐 <strong>Force-Directed Graph</strong> • Hover for details • Click to select • Searched nodes blink blue</p>
        <p>🟢 High Activity • 🟡 Medium Activity • 🔴 Low Activity • <strong>Lines show connections</strong></p>
      </div>
    </div>
  );
};

export default NetworkGraph;