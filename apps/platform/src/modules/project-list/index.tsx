import {
  EditOutlined,
  HddOutlined,
  LoadingOutlined,
  ExclamationCircleFilled,
  SearchOutlined,
} from '@ant-design/icons';
import type { TourProps } from 'antd';
import { Tag } from 'antd';
import { Select } from 'antd';
import { Empty } from 'antd';
import {
  Button,
  Typography,
  Tooltip,
  Modal,
  Input,
  Popover,
  Space,
  Badge,
  message,
  Tour,
} from 'antd';
import { Spin } from 'antd';
import classnames from 'classnames';
import type { ChangeEvent } from 'react';
import { useEffect } from 'react';
import React, { useRef } from 'react';
import { history } from 'umi';

import { CreateProjectModal } from '@/modules/create-project/create-project.view';
import { formatTimestamp } from '@/modules/dag-result/utils';
import {
  GuideTourKeys,
  GuideTourService,
} from '@/modules/guide-tour/guide-tour-service';
import { getModel, Model, useModel } from '@/util/valtio-helper';

import styles from './index.less';
import type { ProjectVO } from './project-list.service';
import { ProjectListService } from './project-list.service';

export enum ComputeModeType {
  'PIPELINE' = 'pipeline',
  'HUB' = 'hub',
}
const computeModeText = {
  [ComputeModeType.PIPELINE]: '管道',
  [ComputeModeType.HUB]: '枢纽',
};

export const ProjectListComponent: React.FC = () => {
  const projectListModel = useModel(ProjectListModel);
  const projectListService = useModel(ProjectListService);

  const { handleCreateProject } = projectListModel;

  const { displayProjectList: projectList } = projectListModel;

  const { Title, Paragraph } = Typography;

  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  useEffect(() => {
    projectListModel.getProjectList();
  }, []);

  // 新手引导
  const ref1 = useRef(null);
  const steps: TourProps['steps'] = [
    {
      title: '恭喜你完成体验🎉',
      description: '这是你创建的项目，以后都可以在这里查看',
      nextButtonProps: {
        children: <div>知道了</div>,
      },
      target: () => ref1.current,
    },
  ];

  // 删除项目
  const deleteProjectItem = (val: ProjectVO) => {
    let inputModalValue = '';
    const modal = Modal.confirm({
      title: `确认要删除「${val.projectName}」吗？`,
      icon: <ExclamationCircleFilled />,
      centered: true,
      content: (
        <>
          <div>即将删除项目及项目内的所有产出，请手动输入项目名称确认删除</div>
          <p>请输入 {val.projectName} 确认操作</p>
          <Input
            onChange={(e) => {
              inputModalValue = e.target.value;
              modal.update({
                okButtonProps: {
                  disabled: e.target.value !== val.projectName,
                  danger: true,
                },
              });
            }}
            placeholder="请输入"
          />
        </>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      okButtonProps: {
        disabled: true,
      },
      async onOk(close) {
        if (inputModalValue === val.projectName) {
          const res = await projectListService.deleteProject(val.projectId as string);
          if (res.code === 0) {
            message.success('删除项目成功');
            projectListModel.getProjectList();
          } else {
            message.error(res.msg);
          }
          return close(Promise.resolve);
        }
      },
    });
  };

  return (
    <div className={styles.projectList}>
      <div className={styles.projectListHeader}>
        {/* <span className={styles.headerText}>我创建的项目</span> */}
        <Space size="middle">
          <Input
            placeholder="搜索项目"
            onChange={(e) => projectListModel.searchProject(e)}
            style={{ width: 200 }}
            suffix={
              <SearchOutlined
                style={{
                  color: '#aaa',
                }}
              />
            }
          />
          <Select
            style={{ width: 180 }}
            defaultValue="all"
            options={[
              { value: 'all', label: '全部计算模式' },
              { value: 'pipeline', label: '管道模式' },
              // { value: 'hub', label: '枢纽模式' },
            ]}
          />

          <CreateProjectModal
            visible={projectListModel.showCreateProjectModel}
            data={{ showBlank: true }}
            close={() => {
              projectListModel.showCreateProjectModel = false;
            }}
          />
        </Space>

        <Button type="primary" onClick={handleCreateProject}>
          新建项目
        </Button>
      </div>
      <Spin
        spinning={projectListModel.projectListService.projectListLoading}
        className={styles.spin}
      >
        <div></div>
      </Spin>
      <div className={styles.content}>
        {projectList.map((item, index) => {
          // 新手引导ref
          const extendProps: Record<string, React.MutableRefObject<null>> = {};
          if (index === 0) {
            extendProps['ref'] = ref1;
          }
          return (
            <div {...extendProps} key={item.projectId} className={styles.listBox}>
              <div style={{ display: 'flex' }}>
                <Tag
                  className={classnames({
                    [styles.computeMode]: item.computeMode === ComputeModeType.PIPELINE,
                  })}
                >
                  {computeModeText[item.computeMode as keyof typeof computeModeText]}
                </Tag>
                <div style={{ flex: 1 }}>
                  <div className={styles.header}>
                    {projectListModel.projectEditStatusMap[item.projectId as string] ? (
                      <Input
                        size="small"
                        defaultValue={
                          projectListModel.projectEditTargetMap[
                            item.projectId as string
                          ]
                        }
                        onBlur={(e) => {
                          projectListModel.endEdit(e, item);
                        }}
                        onPressEnter={async (e) => {
                          projectListModel.endEdit(e, item);
                        }}
                        maxLength={32}
                      />
                    ) : (
                      <Tooltip title={item.projectName}>
                        <Title className={styles.ellipsisName} level={5}>
                          {item.projectName}
                        </Title>
                      </Tooltip>
                    )}
                    {!projectListModel.projectEditStatusMap[
                      item.projectId as string
                    ] && (
                      <EditOutlined
                        className={styles.editButton}
                        onClick={() => {
                          projectListModel.projectEditTargetMap[
                            item.projectId as string
                          ] = item.projectName || '';
                          projectListModel.projectEditStatusMap[
                            item.projectId as string
                          ] = true;
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              <Paragraph ellipsis={{ rows: 2 }} className={styles.ellipsisDesc}>
                {item.description || '暂无描述'}
              </Paragraph>
              <div className={styles.projects}>
                <div className={styles.task}>
                  <div className={styles.titleName}>参与节点</div>

                  <div className={styles.count}>
                    <Popover
                      title={`参与节点 (${item.nodes?.length || 0})`}
                      overlayClassName={styles.popover}
                      placement="right"
                      content={
                        <>
                          {item.nodes && item.nodes.length > 0
                            ? item.nodes.map((node, nodeIndex: number) => {
                                return (
                                  <div
                                    key={`node-${nodeIndex}`}
                                    className={styles.joinNode}
                                  >
                                    <Space>
                                      <HddOutlined />
                                      {node.nodeName}服务节点
                                    </Space>
                                  </div>
                                );
                              })
                            : '暂无参与节点'}
                        </>
                      }
                    >
                      {item.nodes?.length || 0}
                    </Popover>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div className={styles.titleName}>训练流</div>
                  <span className={styles.count}>
                    <Popover
                      title="训练流"
                      overlayClassName={styles.popover}
                      placement="right"
                      onOpenChange={(visible) => {
                        if (visible) {
                          projectListModel.getPipelines(item);
                        } else {
                          projectListModel.pipelines = [];
                        }
                      }}
                      content={
                        <div className={styles.jobsList}>
                          <Spin
                            indicator={antIcon}
                            spinning={projectListModel.fetchingPipelineList}
                          >
                            {projectListModel.pipelines.length > 0
                              ? projectListModel.pipelines.map(
                                  (pipeline, i: number) => {
                                    return (
                                      <div className={styles.pipeLine} key={`job-${i}`}>
                                        {pipeline.name}
                                      </div>
                                    );
                                  },
                                )
                              : '暂无任务流'}
                          </Spin>
                        </div>
                      }
                    >
                      {item.graphCount}
                    </Popover>
                  </span>
                </div>
                <div className={styles.task}>
                  <div className={styles.titleName}>任务数</div>
                  <div className={styles.count}>
                    <Popover
                      title="最新10条运行任务"
                      overlayClassName={styles.popover}
                      placement="right"
                      onOpenChange={(visible) => {
                        if (visible) {
                          projectListModel.getJobs(item);
                        } else {
                          projectListModel.jobs = [];
                        }
                      }}
                      content={
                        <div className={styles.jobsList}>
                          {(() => {
                            const data = projectListModel.jobs.map(
                              (job, jobIndex: number) => {
                                return (
                                  <div
                                    className={styles.jobItem + ' ' + styles.pipeLine}
                                    key={`task-${jobIndex}`}
                                  >
                                    <Space>
                                      <Badge
                                        status={projectListModel.mapStatusToBadge(
                                          job.status as API.GraphJobStatus,
                                        )}
                                        text=""
                                      />
                                      <span>
                                        {formatTimestamp(job.gmtCreate as string)}
                                      </span>
                                    </Space>
                                    <div className={styles.jobItemID}>
                                      ID: {job.jobId}
                                    </div>
                                  </div>
                                );
                              },
                            );
                            if (data.length > 0) return data;

                            return <Empty description={false} />;
                          })()}
                        </div>
                      }
                    >
                      {item.jobCount}
                    </Popover>
                  </div>
                </div>
              </div>
              <div className={styles.time}>
                创建于{formatTimestamp(item.gmtCreate as string)}
              </div>
              <div className={styles.bootom}>
                <Button
                  type="primary"
                  size="small"
                  style={{ flex: 1 }}
                  onClick={() => {
                    history.push({
                      pathname: '/dag',
                      search: `projectId=${item.projectId}`,
                    });
                  }}
                >
                  进入训练
                </Button>
                <Button
                  size="small"
                  onClick={() => deleteProjectItem(item)}
                  style={{ flex: 1 }}
                >
                  删除
                </Button>
              </div>
            </div>
          );
        })}
        <i></i>
        <i></i>
        <i></i>
      </div>
      <Tour
        open={
          !projectListModel.guideTourService.ProjectListTour && projectList.length === 1
        }
        onClose={() => projectListModel.closeGuideTour()}
        mask={false}
        type="primary"
        steps={steps}
        placement="right"
        prefixCls="project-list-tour"
      />
    </div>
  );
};

export class ProjectListModel extends Model {
  pipelines: API.GraphMetaVO[] = [];

  fetchingPipelineList = false;

  fetchingTaskList = false;

  jobs: API.ProjectJobSummaryVO[] = [];

  displayProjectList: API.ProjectVO[] = [];

  projectEditStatusMap: { [key: string]: boolean } = {};

  projectEditTargetMap: { [key: string]: string } = {};

  showCreateProjectModel = false;

  readonly projectListService;
  readonly guideTourService;

  constructor() {
    super();
    this.projectListService = getModel(ProjectListService);
    this.guideTourService = getModel(GuideTourService);
  }

  closeGuideTour() {
    this.guideTourService.finishTour(GuideTourKeys.ProjectListTour);
  }

  async endEdit(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.KeyboardEvent<HTMLInputElement>
      | React.FocusEvent<HTMLInputElement, Element>,
    item: API.ProjectVO,
  ) {
    const params = {
      projectId: item.projectId as string,
      name: (e.target as HTMLInputElement).value,
      description: item.description as string,
    };
    message.loading({ content: '更新中', key: item.projectId });
    await this.projectListService.updateProject(params);
    message.destroy(item.projectId);
    await this.getProjectList();
    this.projectEditStatusMap[item.projectId as string] = false;
  }

  async getProjectList() {
    this.displayProjectList = await this.projectListService.getListProject();
  }

  async getPipelines(projectInfo: API.ProjectVO) {
    this.fetchingPipelineList = true;
    const pipelines = await this.projectListService.getPipelines(
      projectInfo.projectId || '',
    );
    this.pipelines = pipelines;
    this.fetchingPipelineList = false;
  }

  async getJobs(projectInfo: API.ProjectVO) {
    this.fetchingTaskList = true;
    const jobs = await this.projectListService.getJobs(projectInfo.projectId || '');
    this.jobs = (jobs as API.PageResponse_ProjectJobSummaryVO_).data || [];
    this.fetchingTaskList = false;
  }

  searchProject(e: ChangeEvent<HTMLInputElement>) {
    this.displayProjectList = this.projectListService.projectList.filter((i) => {
      if (!i.projectName) return;
      return i.projectName?.indexOf(e.target.value) >= 0;
    });
  }

  listProjectByMode(mode: 'all' | 'pipeline') {
    switch (mode) {
      case 'pipeline':
        this.displayProjectList = this.projectListService.projectList.filter((i) => {
          // TODO: api pending
          return !i.computeMode || i.computeMode === 'pipeline';
        });
        return;
      default:
        this.displayProjectList = this.projectListService.projectList;
    }
  }

  handleCreateProject = () => {
    this.showCreateProjectModel = true;
  };

  mapStatusToBadge = (status: API.GraphJobStatus) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'processing';
      case 'failed':
        return 'error';
      case 'succeed':
        return 'success';
      case 'stopped':
        return 'warning';
    }
  };
}
