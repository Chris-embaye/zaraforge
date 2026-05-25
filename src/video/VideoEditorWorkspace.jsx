import VideoLeftSidebar  from './VideoLeftSidebar'
import VideoRightSidebar from './VideoRightSidebar'
import VideoTimeline     from './VideoTimeline'
import VideoMonitors     from './VideoMonitors'

export default function VideoEditorWorkspace() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'row',
      minHeight: 0, overflow: 'hidden',
      background: '#08080d',
    }}>
      <VideoLeftSidebar />

      {/* Centre column: monitors + timeline */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <VideoMonitors />
        <VideoTimeline />
      </div>

      <VideoRightSidebar />
    </div>
  )
}
