import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * API 명세 전용 사이드바
 * REST API 및 Socket Events 문서를 카테고리별로 구성
 */
const sidebars: SidebarsConfig = {
  apiSidebar: [
    'overview', // API 개요 문서
    {
      type: 'category',
      label: 'REST API',
      items: ['rest/room-api', 'rest/health-api'],
    },
    {
      type: 'category',
      label: 'Socket Events',
      items: [
        'socket/room',
        'socket/participant',
        'socket/file',
        'socket/code-execution',
        'socket/chat',
      ],
    },
  ],
};

export default sidebars;
