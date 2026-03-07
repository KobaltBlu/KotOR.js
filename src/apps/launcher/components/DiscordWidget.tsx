import React, { useState, useEffect } from 'react';
import '../styles/DiscordWidget.scss';

interface DiscordMember {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  avatar_url: string;
  game?: {
    name: string;
  };
}

interface DiscordServer {
  id: string;
  name: string;
  instant_invite: string | null;
  channels: Array<{
    id: string;
    name: string;
    position: number;
  }>;
  members: DiscordMember[];
  presence_count: number;
}

interface DiscordWidgetProps {
  serverId?: string;
  className?: string;
}

const imageBase64 = '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';

const base64ToImage = (base64: string) => {
  return `data:image/png;base64,${base64}`;
}

const DiscordWidget: React.FC<DiscordWidgetProps> = ({ 
  serverId = "", 
  className = "" 
}) => {
  const [serverData, setServerData] = useState<DiscordServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiscordData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // For now, we'll use the local discord.json file
        // In a real implementation, you'd fetch from Discord's widget API
        const response = await fetch(`https://discord.com/api/guilds/${serverId}/widget.json`);
        if (!response.ok) {
          throw new Error('Failed to fetch Discord data');
        }
        
        const data: DiscordServer = await response.json();
        setServerData(data);
      } catch (err) {
        console.error('Error fetching Discord data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDiscordData();
  }, [serverId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#43b581';
      case 'idle':
        return '#faa61a';
      case 'dnd':
        return '#f04747';
      default:
        return '#747f8d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return '●';
      case 'idle':
        return '⏸';
      case 'dnd':
        return '⛔';
      default:
        return '○';
    }
  };

  const handleOpenDiscord = () => {
    if (serverData?.instant_invite) {
      window.open(serverData.instant_invite, '_blank');
    } else {
      // Fallback to Discord invite or server page
      // window.open(`https://discord.gg/${serverId}`, '_blank');
      window.open(`https://discord.gg/QxjqVAuN8T`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className={`discord-widget ${className}`}>
        <div className="discord-widget-header">
          <div className="discord-widget-server-info">
            <img 
              src={base64ToImage(imageBase64)} 
              alt="Discord server icon"
              className="discord-widget-server-icon"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="discord-widget-server-details">
              <div className="discord-widget-title">Discord</div>
            </div>
          </div>
        </div>
        <div className="discord-widget-content">
          <div className="discord-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !serverData) {
    return (
      <div className={`discord-widget ${className}`}>
        <div className="discord-widget-header">
          <div className="discord-widget-server-info">
            <img 
              src={base64ToImage(imageBase64)}
              alt="Discord server icon"
              className="discord-widget-server-icon"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="discord-widget-server-details">
              <div className="discord-widget-title">Discord</div>
            </div>
          </div>
        </div>
        <div className="discord-widget-content">
          <div className="discord-error">
            Failed to load Discord data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`discord-widget ${className}`}>
      <div className="discord-widget-header">
        <div className="discord-widget-server-info">
          <img 
            src={base64ToImage(imageBase64)}
            alt={`${serverData.name} server icon`}
            className="discord-widget-server-icon"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <div className="discord-widget-server-details">
            <div className="discord-widget-title">{serverData.name}</div>
            <div className="discord-widget-subtitle">
              {serverData.presence_count} members online
            </div>
          </div>
        </div>
      </div>
      
      <div className="discord-widget-content">
        <div className="discord-members-list">
          {serverData.members.map((member) => (
            <div key={member.id} className="discord-member">
              <div className="discord-member-avatar">
                <img 
                  src={member.avatar_url} 
                  alt={member.username}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://cdn.discordapp.com/embed/avatars/${parseInt(member.discriminator) % 5}.png`;
                  }}
                />
                <div 
                  className="discord-member-status"
                  style={{ backgroundColor: getStatusColor(member.status) }}
                >
                  {getStatusIcon(member.status)}
                </div>
              </div>
              <div className="discord-member-info">
                <div className="discord-member-name">
                  {member.username}
                  {member.game && (
                    <div className="discord-member-game">
                      Playing {member.game.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="discord-widget-footer">
        <button 
          className="discord-open-button"
          onClick={handleOpenDiscord}
        >
          <i className="fab fa-discord"></i>
          Open in Discord
        </button>
      </div>
    </div>
  );
};

export default DiscordWidget;
