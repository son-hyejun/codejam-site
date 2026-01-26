import { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import { Rocket, BookOpen, Zap, Users, MousePointer2 } from 'lucide-react'; // 아이콘 추가

// 헤더 섹션 컴포넌트
function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20 lg:py-32">
      {/* 배경 장식 요소 (선택사항) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px]" />
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-green-400/20 blur-[100px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        {/* 로고 */}
        <div className="mb-8 flex justify-center">
          <img
            src="img/logo_animation.svg"
            alt="CodeJam"
            className="w-32 h-32 drop-shadow-xl animate-in fade-in zoom-in duration-700"
          />
        </div>

        {/* 타이틀 */}
        <Heading
          as="h1"
          className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500 dark:from-blue-400 dark:to-green-400">
            {siteConfig.title}
          </span>
        </Heading>

        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          {siteConfig.tagline}
        </p>

        {/* 버튼 그룹 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            className="flex items-center gap-2 px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-200 no-underline"
            to="https://lets-codejam.vercel.app/"
          >
            CodeJam 시작하기 <Rocket className="w-5 h-5" />
          </Link>
          <Link
            className="flex items-center gap-2 px-8 py-4 text-lg font-bold text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-200 no-underline dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
            to="/docs/intro"
          >
            사용법 문서 <BookOpen className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

// Feature 아이템 컴포넌트
function FeatureItem({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center p-6 text-center rounded-2xl bg-white/50 border border-gray-100 shadow-sm dark:bg-gray-800/50 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="p-3 mb-4 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={`${siteConfig.title} 공식 문서 및 도움말`}
      description="실시간 협업 코드 에디터 CodeJam"
    >
      <HomepageHeader />

      <main>
        <section className="py-16 bg-white dark:bg-[#1b1b1d]">
          <div className="container mx-auto px-4">
            {/* 특징 섹션 (간단하게) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <FeatureItem
                icon={Zap}
                title="즉시 시작"
                description="로그인도, 설정도 필요 없습니다. 링크만 공유하세요."
              />
              <FeatureItem
                icon={Users}
                title="실시간 협업"
                description="여러 명의 팀원과 동시에 코드를 편집하고 커서를 공유하세요."
              />
              <FeatureItem
                icon={MousePointer2}
                title="가벼운 에디터"
                description="복잡한 기능은 빼고, 코딩에 꼭 필요한 핵심 기능만 담았습니다."
              />
            </div>

            {/* 데모 이미지 섹션 */}
            <div className="flex flex-col items-center">
              <div className="relative group max-w-4xl w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  {/* 브라우저 상단 바 느낌 */}
                  <div className="h-8 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <img
                    src="img/demo-preview.gif"
                    alt="CodeJam Demo"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
